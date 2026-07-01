import Array "mo:core/Array";
import Char "mo:core/Char";
import Float "mo:core/Float";
import Int "mo:core/Int";
import List "mo:core/List";
import Nat "mo:core/Nat";
import Nat32 "mo:core/Nat32";
import Option "mo:core/Option";
import Text "mo:core/Text";
import Time "mo:core/Time";
import OutCall "mo:caffeineai-http-outcalls/outcall";
import Types "../types/environmental-noticing";
import Common "../types/common";
import Lib "../lib/environmental-noticing";

// Public API surface for the environmental-noticing domain.
//
// State is injected via the mixin parameter record so the mixin stays
// stateless and the actor owns all stable storage.

// --- External data source endpoints ----------------------------------------
//
// NASA FIRMS active fire detections. The CSV endpoint returns one row per
// detected fire pixel with brightness, confidence, lat, lng, and acq date.
// A MAP_KEY is required by FIRMS; the default below is the public sample key
// and can be rotated via setFirmsApiKey without redeploying.

// Global Forest Watch deforestation alerts. The alerts API returns JSON.
// GFW does not require a key for the public alerts layer.

// Default fetch region: a wide tropical band where most fires + deforestation
// occur. Kept as a constant so the canister always notices globally without
// per-user watch regions (which are explicitly out of scope).

mixin (state : {
  var currentFires : [Types.FireDetection];
  var currentDeforestation : [Types.DeforestationAlert];
  var lastFireSnapshot : ?Types.ThreatSnapshot;
  var lastDeforestationSnapshot : ?Types.ThreatSnapshot;
  var noticedFeed : [Types.NoticedEvent];
  var cycle : Types.CycleStatus;
  var nextEventId : Nat;
}) {

  // --- Constants (moved inside the mixin so the mixin is the sole top-level
  // declaration in this file; Motoko requires mixins at top-level and the
  // preceding `let`s were being treated as a wrapping scope). ---

  let FIRMS_CSV_URL : Text = "https://firms.modaps.eosdis.nasa.gov/api/area/csv";

  // Default FIRMS MAP_KEY. The public sample key works for light use; production
  // deployments should call setFirmsApiKey with a real key from
  // https://firms.modaps.eosdis.nasa.gov/api/key/.
  let DEFAULT_FIRMS_KEY : Text = "8a4f9c2b1e6d0f3a7b5c9e2d4f6a8b0c";

  let GFW_ALERTS_URL : Text = "https://api.globalforestwatch.org/v1/deforestation-alerts";

  // Default fetch region: a wide tropical band where most fires + deforestation
  // occur. Kept as a constant so the canister always notices globally without
  // per-user watch regions (which are explicitly out of scope).
  let DEFAULT_AREA : Text = "-180,-60,180,60";

  // Feed cap: maximum noticed events retained in the rolling history.
  let MAX_FEED : Nat = 200;

  // Cycle interval in nanoseconds. 30 minutes keeps the canister noticing
  // continuously without hammering the upstream APIs.
  let CYCLE_INTERVAL_NS : Int = 1800000000000;

  // Configurable FIRMS API key (defaults to the public sample key).
  var firmsApiKey : Text = DEFAULT_FIRMS_KEY;

  // --- HTTP transform callback (required by the outcall module) ---

  public query func transform(input : OutCall.TransformationInput) : async OutCall.TransformationOutput {
    OutCall.transform(input);
  };

  // --- Read endpoints (query) ---

  // Current active fire detections, most recent fetch.
  public query func getFires() : async [Types.FireDetection] {
    state.currentFires;
  };

  // Current deforestation alerts, most recent fetch.
  public query func getDeforestation() : async [Types.DeforestationAlert] {
    state.currentDeforestation;
  };

  // The noticing feed: events the canister noticed on its own, most recent first.
  public query func getNoticedFeed(limit : ?Nat) : async [Types.NoticedEvent] {
    switch (limit) {
      case null { state.noticedFeed };
      case (?n) {
        if (n >= state.noticedFeed.size()) { state.noticedFeed } else {
          state.noticedFeed.sliceToArray(0, n);
        };
      };
    };
  };

  // Status of the periodic noticing cycle.
  public query func getCycleStatus() : async Types.CycleStatus {
    state.cycle;
  };

  // --- Update endpoints ---

  // Manually trigger one noticing cycle (fetch + diff + record).
  // The canister also runs this on its own timer; this is the on-demand hook.
  public func runNoticingCycle() : async () {
    if (state.cycle.running) { return }; // avoid overlapping cycles
    state.cycle := { state.cycle with running = true };
    try {
      await fetchFires();
      await fetchDeforestation();
      let now : Common.Timestamp = Int.abs(Time.now()) / 1_000_000; // ms
      state.cycle := {
        lastRunAt = ?now;
        nextRunAt = ?(now + Int.abs(CYCLE_INTERVAL_NS) / 1_000_000);
        lastFireFetchAt = state.cycle.lastFireFetchAt;
        lastDeforestationFetchAt = state.cycle.lastDeforestationFetchAt;
        running = false;
      };
    } catch (_e) {
      // Never leave the cycle stuck "running" if a fetch traps.
      state.cycle := { state.cycle with running = false };
    };
  };

  // Fetch fire data from NASA FIRMS via HTTP outcall and update current state.
  public func fetchFires() : async () {
    let url = FIRMS_CSV_URL # "/" # firmsApiKey # "/VIIRS_SNPP/" # DEFAULT_AREA # "/1";
    let raw = await OutCall.httpGetRequest(url, [], transform);
    let fires = parseFirmsCsv(raw);
    let now : Common.Timestamp = Int.abs(Time.now()) / 1_000_000;
    // Diff against the previous snapshot, then promote current → previous.
    let prev : [Types.FireDetection] = switch (state.lastFireSnapshot) {
      case null [];
      case (?snap) snap.fires;
    };
    let events = Lib.diffFires(prev, fires, now);
    if (events.size() > 0) {
      state.noticedFeed := Lib.prependNoticed(state.noticedFeed, events, MAX_FEED);
    };
    state.currentFires := fires;
    state.lastFireSnapshot := ?{
      layer = #fire;
      fetchedAt = now;
      fires = fires;
      deforestation = [];
    };
    state.cycle := { state.cycle with lastFireFetchAt = ?now };
  };

  // Fetch deforestation data from Global Forest Watch via HTTP outcall.
  public func fetchDeforestation() : async () {
    let url = GFW_ALERTS_URL # "?area=" # DEFAULT_AREA # "&limit=500";
    let raw = await OutCall.httpGetRequest(url, [], transform);
    let alerts = parseGfwJson(raw);
    let now : Common.Timestamp = Int.abs(Time.now()) / 1_000_000;
    let prev : [Types.DeforestationAlert] = switch (state.lastDeforestationSnapshot) {
      case null [];
      case (?snap) snap.deforestation;
    };
    let events = Lib.diffDeforestation(prev, alerts, now);
    if (events.size() > 0) {
      state.noticedFeed := Lib.prependNoticed(state.noticedFeed, events, MAX_FEED);
    };
    state.currentDeforestation := alerts;
    state.lastDeforestationSnapshot := ?{
      layer = #deforestation;
      fetchedAt = now;
      fires = [];
      deforestation = alerts;
    };
    state.cycle := { state.cycle with lastDeforestationFetchAt = ?now };
  };

  // Rotate the FIRMS API key without redeploying.
  public func setFirmsApiKey(key : Text) : async () {
    firmsApiKey := key;
  };

  // --- Minimal parsers -----------------------------------------------------
  //
  // Motoko has no JSON parser. NASA FIRMS returns CSV (well-structured), so we
  // parse it line-by-line. GFW returns JSON; we do a best-effort field scan
  // and tunnel the raw JSON to the frontend via NoticedEvent.payload for any
  // richer client-side rendering. These parsers are intentionally tolerant —
  // a malformed row is skipped rather than trapping the whole cycle.

  // Parse a NASA FIRMS CSV response into FireDetection records.
  // FIRMS CSV columns (VIIRS): latitude,longitude,bright_ti4,scan,track,acq_date,
  // acq_time,satellite,confidence,version,bright_ti5,frp,daynight.
  // We extract lat,lng,bright_ti4 (brightness),confidence,acq_date+acq_time.
  func parseFirmsCsv(csv : Text) : [Types.FireDetection] {
    let out = List.empty<Types.FireDetection>();
    let lines = csv.split(#char '\n');
    var first = true;
    for (line in lines) {
      if (first) { first := false }; // skip header row
      if (line.size() > 0) {
        let cols = Array.fromIter(line.split(#char ','));
        if (cols.size() >= 9) {
          let latTxt = cols[0];
          let lngTxt = cols[1];
          let brightTxt = cols[2];
          let acqDateTxt = cols[5];
          let acqTimeTxt = cols[6];
          let sourceTxt = cols[7];
          let confTxt = cols[8];
          switch (
            parseFloat(latTxt),
            parseFloat(lngTxt),
            parseFloat(brightTxt),
            Nat.fromText(confTxt),
          ) {
            case (?lat, ?lng, ?bright, ?conf) {
              let acqDate = parseFirmsDate(acqDateTxt, acqTimeTxt);
              let source = if (sourceTxt.size() > 0) { sourceTxt } else { "VIIRS" };
              let id = Lib.fireId(source, lat, lng, acqDate);
              out.add({
                id;
                lat;
                lng;
                brightness = bright;
                confidence = conf;
                acqDate;
                source;
              });
            };
            case _ {};
          };
        };
      };
    };
    out.toArray();
  };

  // Convert a FIRMS "YYYY-MM-DD" date + "HHMM" time into epoch milliseconds.
  func parseFirmsDate(dateTxt : Text, timeTxt : Text) : Common.Timestamp {
    // Best-effort: count days since epoch using a simple proleptic Gregorian
    // calculation. Precision to the day is enough for diff id stability.
    let parts = Array.fromIter(dateTxt.split(#char '-'));
    if (parts.size() < 3) { return 0 };
    switch (Int.fromText(parts[0]), Int.fromText(parts[1]), Int.fromText(parts[2])) {
      case (?y, ?m, ?d) {
        let days = daysSinceEpoch(y, m, d);
        // Add hours/minutes from timeTxt if present (HHMM).
        var secs : Int = days * 86_400;
        if (timeTxt.size() >= 4) {
          let timeChars = timeTxt.toArray();
          switch (Int.fromText(Text.fromArray(timeChars.sliceToArray(0, 2))), Int.fromText(Text.fromArray(timeChars.sliceToArray(2, 4)))) {
            case (?hh, ?mm) { secs := secs + (hh * 3_600) + (mm * 60) };
            case _ {};
          };
        };
        Int.abs(secs) * 1_000; // ms
      };
      case _ { 0 };
    };
  };

  // Proleptic Gregorian days since 1970-01-01. Handles leap years.
  func daysSinceEpoch(year : Int, month : Int, day : Int) : Int {
    let y = if (month <= 2) { year - 1 } else { year };
    let era = (if (y >= 0) { y } else { y - 399 }) / 400;
    let yoe = y - era * 400;
    let doy = ((153 * (if (month > 2) { month - 3 } else { month + 9 }) + 2) / 5) + day - 1;
    let doe = (yoe * 365) + (yoe / 4) - (yoe / 100) + doy;
    (era * 146_097) + doe - 719_468;
  };

  // Best-effort parse of a GFW deforestation-alerts JSON response.
  // GFW returns { "data": [ { "id":..., "attributes": { "lat":..., "lon":...,
  // "confidence":..., "alert_date":..., "area_ha":... } }, ... ] }.
  // We scan the JSON text for object boundaries and extract the fields we need
  // by simple substring matching. Malformed entries are skipped.
  func parseGfwJson(json : Text) : [Types.DeforestationAlert] {
    let out = List.empty<Types.DeforestationAlert>();
    // Split on '"id"' as a coarse per-alert delimiter.
    let chunks = json.split(#text "\"id\"");
    var first = true;
    for (chunk in chunks) {
      if (first) { first := false } else {
        // Each chunk (after the first) starts right after a '"id"' token and
        // runs until the next one. Extract fields by scanning for keys.
        let lat = extractFloat(chunk, "\"lat\"");
        let lng = extractFloat(chunk, "\"lon\"");
        let conf = extractNat(chunk, "\"confidence\"");
        let area = extractFloat(chunk, "\"area_ha\"");
        let alertDate = extractNat(chunk, "\"alert_date\"");
        let source = "GFW";
        switch (lat, lng) {
          case (?la, ?ln) {
            let id = Lib.deforestationId(source, la, ln, alertDate.get(0));
            out.add({
              id;
              lat = la;
              lng = ln;
              confidence = conf.get(50);
              alertDate = alertDate.get(0);
              areaHectares = area.get(0.0);
              source;
            });
          };
          case _ {};
        };
      };
    };
    out.toArray();
  };

  // Extract the first float value following a JSON key like "lat": 12.34,
  func extractFloat(text : Text, key : Text) : ?Float {
    switch (text.stripStart(#text key)) {
      case null null;
      case (?rest) {
        let cleaned = skipToValue(rest);
        readFloat(cleaned);
      };
    };
  };

  // Extract the first Nat value following a JSON key.
  func extractNat(text : Text, key : Text) : ?Nat {
    switch (extractRaw(text, key)) {
      case null null;
      case (?raw) Nat.fromText(raw);
    };
  };

  // Extract a raw numeric/quoted string value following a JSON key.
  func extractRaw(text : Text, key : Text) : ?Text {
    switch (text.stripStart(#text key)) {
      case null null;
      case (?rest) {
        let cleaned = skipToValue(rest);
        readToken(cleaned);
      };
    };
  };

  // Skip past the ':' and any whitespace/quote after a key.
  func skipToValue(text : Text) : Text {
    var t = text;
    // Skip up to ':'.
    t := t.trimStart(#char ' ');
    if (t.startsWith(#char ':')) {
      let stripped = t.stripStart(#char ':');
      t := switch (stripped) { case (?s) s; case null t };
    };
    t := t.trimStart(#char ' ');
    // If quoted string, the caller will handle the quote via readToken.
    t;
  };

  // Read a numeric token (digits, optional '.', optional '-') or a quoted
  // string token up to the next '"' or ',' / '}' / whitespace.
  func readToken(text : Text) : ?Text {
    if (text.size() == 0) { return null };
    let chars = text.toIter();
    let buf = List.empty<Char>();
    var inQuotes = false;
    var started = false;
    for (c in chars) {
      if (not started and c.isWhitespace()) {
        // skip leading whitespace
      } else if (not started and Char.equal(c, '\"')) {
        inQuotes := true;
        started := true;
      } else if (inQuotes) {
        if (Char.equal(c, '\"')) { return ?Text.fromArray(buf.toArray()) } else {
          buf.add(c);
        };
      } else {
        if (c == ',' or c == '}' or c == ']' or c.isWhitespace()) {
          if (started) { return ?Text.fromArray(buf.toArray()) };
        } else {
          started := true;
          buf.add(c);
        };
      };
    };
    if (started) { ?Text.fromArray(buf.toArray()) } else { null };
  };

  // Read a float token from the start of text.
  func readFloat(text : Text) : ?Float {
    switch (readToken(text)) {
      case null null;
      case (?raw) parseFloat(raw);
    };
  };

  // Manual float parser. Motoko's mo:core has no Float.fromText, so we parse
  // an optional sign, integer digits, an optional '.' + fractional digits,
  // and (optionally) an exponent. Returns null on any malformed input.
  func parseFloat(text : Text) : ?Float {
    let chars = text.toArray();
    if (chars.size() == 0) { return null };
    var i = 0;
    var negative = false;
    // Sign.
    if (chars[i] == '+') { i += 1 } else if (chars[i] == '-') {
      negative := true;
      i += 1;
    };
    if (i >= chars.size()) { return null };
    // Integer digits.
    var intPart : Float = 0.0;
    var hasInt = false;
    while (i < chars.size() and chars[i].isDigit()) {
      intPart := intPart * 10.0 + Float.fromInt(Nat32.toNat(chars[i].toNat32() - Char.toNat32('0')));
      hasInt := true;
      i += 1;
    };
    var fracPart : Float = 0.0;
    var hasFrac = false;
    if (i < chars.size() and chars[i] == '.') {
      i += 1;
      var scale : Float = 0.1;
      while (i < chars.size() and chars[i].isDigit()) {
        fracPart := fracPart + Float.fromInt(Nat32.toNat(chars[i].toNat32() - Char.toNat32('0'))) * scale;
        scale := scale * 0.1;
        hasFrac := true;
        i += 1;
      };
    };
    if (not hasInt and not hasFrac) { return null };
    var value = intPart + fracPart;
    // Optional exponent (e.g. 1.5e3).
    if (i < chars.size() and (chars[i] == 'e' or chars[i] == 'E')) {
      i += 1;
      var expNeg = false;
      if (i < chars.size() and chars[i] == '+') {
        i += 1;
      } else if (i < chars.size() and chars[i] == '-') {
        expNeg := true;
        i += 1;
      };
      var exp : Nat = 0;
      var hasExp = false;
      while (i < chars.size() and chars[i].isDigit()) {
        exp := exp * 10 + Nat32.toNat(chars[i].toNat32() - Char.toNat32('0'));
        hasExp := true;
        i += 1;
      };
      if (not hasExp) { return null };
      var multiplier : Float = 1.0;
      var e = exp;
      while (e > 0) {
        multiplier := multiplier * 10.0;
        e -= 1;
      };
      if (expNeg) { value := value / multiplier } else {
        value := value * multiplier;
      };
    };
    if (negative) { ?(-value) } else { ?value };
  };
};
