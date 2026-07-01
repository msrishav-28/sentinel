import Array "mo:core/Array";
import Float "mo:core/Float";
import Nat "mo:core/Nat";
import Text "mo:core/Text";
import List "mo:core/List";
import Types "../types/environmental-noticing";
import Common "../types/common";

module {
  // Domain logic for the environmental-noticing domain.
  // Stateless module functions; state is injected by the mixin / actor.

  public type FireDetection = Types.FireDetection;
  public type DeforestationAlert = Types.DeforestationAlert;
  public type ThreatSnapshot = Types.ThreatSnapshot;
  public type NoticedEvent = Types.NoticedEvent;
  public type NoticeReason = Types.NoticeReason;

  // Round a Float to a fixed number of decimal places for stable id hashing.
  // Coordinates are snapped to ~1km precision so the same fire shows up with
  // the same id across fetches even with tiny float jitter.
  func roundCoord(x : Float, places : Nat) : Float {
    let factor = Float.pow(10.0, Float.fromInt(places.toInt()));
    Float.floor((x * factor) + 0.5) / factor;
  };

  // Build a composite id for a fire detection (stable across fetches).
  // Snapping lat/lng to 2 decimals (~1km) keeps the same physical fire
  // producing the same id even with sub-km float jitter between fetches.
  public func fireId(source : Text, lat : Common.Latitude, lng : Common.Longitude, acqDate : Common.Timestamp) : Text {
    let rLat = roundCoord(lat, 2);
    let rLng = roundCoord(lng, 2);
    source # ":" # rLat.toText() # ":" # rLng.toText() # ":" # acqDate.toText();
  };

  // Build a composite id for a deforestation alert.
  public func deforestationId(source : Text, lat : Common.Latitude, lng : Common.Longitude, alertDate : Common.Timestamp) : Text {
    let rLat = roundCoord(lat, 2);
    let rLng = roundCoord(lng, 2);
    source # ":" # rLat.toText() # ":" # rLng.toText() # ":" # alertDate.toText();
  };

  // Weight a fire detection into a Severity based on brightness + confidence.
  // FIRMS brightness is in Kelvin; ~300K is background, ~320K is a confident
  // fire, >350K is a hot intense fire. Confidence 0-100.
  public func fireSeverity(brightness : Float, confidence : Nat) : Common.Severity {
    // Combine brightness band and confidence into a single 0-100 score.
    let brightScore : Float = if (brightness >= 350.0) { 100.0 } else if (brightness >= 330.0) {
      70.0 + ((brightness - 330.0) * 1.5);
    } else if (brightness >= 320.0) {
      40.0 + ((brightness - 320.0) * 3.0);
    } else {
      // Below 320K: weak signal, scale by how far above background (~300K).
      Float.max(0.0, (brightness - 300.0) * 2.0);
    };
    let confScore = Float.fromInt(confidence.toInt());
    let score = (brightScore * 0.6) + (confScore * 0.4);
    if (score >= 85.0) { #critical } else if (score >= 70.0) {
      #severe;
    } else if (score >= 55.0) { #high } else if (score >= 35.0) {
      #moderate;
    } else { #low };
  };

  // Weight a deforestation alert into a Severity based on confidence + area.
  public func deforestationSeverity(confidence : Nat, areaHectares : Float) : Common.Severity {
    let confScore = Float.fromInt(confidence.toInt());
    // Area bands: <5ha small, 5-25 medium, 25-100 large, >100 major.
    let areaScore : Float = if (areaHectares >= 100.0) { 100.0 } else if (areaHectares >= 25.0) {
      60.0 + ((areaHectares - 25.0) * 0.53);
    } else if (areaHectares >= 5.0) {
      30.0 + ((areaHectares - 5.0) * 1.5);
    } else {
      Float.max(0.0, areaHectares * 6.0);
    };
    let score = (confScore * 0.5) + (areaScore * 0.5);
    if (score >= 85.0) { #critical } else if (score >= 70.0) {
      #severe;
    } else if (score >= 55.0) { #high } else if (score >= 35.0) {
      #moderate;
    } else { #low };
  };

  // Find a fire in an array by id.
  func findFire(fires : [FireDetection], id : Text) : ?FireDetection {
    fires.find(func f { f.id == id });
  };

  // Find a deforestation alert in an array by id.
  func findDeforest(alerts : [DeforestationAlert], id : Text) : ?DeforestationAlert {
    alerts.find(func a { a.id == id });
  };

  // Build a NoticedEvent for a fire.
  func fireEvent(id : Text, reason : NoticeReason, sev : Common.Severity, f : FireDetection, now : Common.Timestamp, summary : Text, payload : Text) : NoticedEvent {
    {
      id;
      layer = #fire;
      reason;
      severity = sev;
      lat = f.lat;
      lng = f.lng;
      noticedAt = now;
      summary;
      payload;
    };
  };

  // Build a NoticedEvent for a deforestation alert.
  func deforestEvent(id : Text, reason : NoticeReason, sev : Common.Severity, a : DeforestationAlert, now : Common.Timestamp, summary : Text, payload : Text) : NoticedEvent {
    {
      id;
      layer = #deforestation;
      reason;
      severity = sev;
      lat = a.lat;
      lng = a.lng;
      noticedAt = now;
      summary;
      payload;
    };
  };

  // Diff two fire snapshots and return the noticed events for the new state.
  // Detects new fires, worsening fires (brightness/confidence up), escalating
  // fires (severity threshold crossed), and lingering fires still active
  // across cycles.
  public func diffFires(prev : [FireDetection], next : [FireDetection], now : Common.Timestamp) : [NoticedEvent] {
    let events = List.empty<NoticedEvent>();

    for (nf in next.vals()) {
      let nsev = fireSeverity(nf.brightness, nf.confidence);
      let nweight = Common.severityWeight(nsev);
      switch (findFire(prev, nf.id)) {
        case null {
          // Brand-new fire since last fetch.
          events.add(fireEvent(
            nf.id,
            #newEvent,
            nsev,
            nf,
            now,
            "New " # nf.source # " fire detected at " # nf.lat.toText() # "," # nf.lng.toText() # " (brightness " # nf.brightness.toText() # "K)",
            "{}",
          ));
        };
        case (?pf) {
          let psev = fireSeverity(pf.brightness, pf.confidence);
          let pweight = Common.severityWeight(psev);
          let brightUp = nf.brightness > pf.brightness * 1.05;
          let confUp = nf.confidence > pf.confidence + 10;
          if (nweight > pweight) {
            // Severity threshold crossed upward.
            events.add(fireEvent(
              nf.id,
              #escalating,
              nsev,
              nf,
              now,
              nf.source # " fire escalating at " # nf.lat.toText() # "," # nf.lng.toText() # " — severity " # pweight.toText() # "→" # nweight.toText(),
              "{}",
            ));
          } else if (brightUp or confUp) {
            // Same severity band but intensifying.
            events.add(fireEvent(
              nf.id,
              #worsening,
              nsev,
              nf,
              now,
              nf.source # " fire worsening at " # nf.lat.toText() # "," # nf.lng.toText() # " — brightness " # pf.brightness.toText() # "K→" # nf.brightness.toText() # "K",
              "{}",
            ));
          } else {
            // Still active across cycles — lingering.
            events.add(fireEvent(
              nf.id,
              #lingering,
              nsev,
              nf,
              now,
              nf.source # " fire still active at " # nf.lat.toText() # "," # nf.lng.toText() # " (brightness " # nf.brightness.toText() # "K)",
              "{}",
            ));
          };
        };
      };
    };

    events.toArray();
  };

  // Diff two deforestation snapshots and return the noticed events.
  public func diffDeforestation(prev : [DeforestationAlert], next : [DeforestationAlert], now : Common.Timestamp) : [NoticedEvent] {
    let events = List.empty<NoticedEvent>();

    for (na in next.vals()) {
      let nsev = deforestationSeverity(na.confidence, na.areaHectares);
      let nweight = Common.severityWeight(nsev);
      switch (findDeforest(prev, na.id)) {
        case null {
          // New deforestation alert.
          events.add(deforestEvent(
            na.id,
            #newEvent,
            nsev,
            na,
            now,
            "New " # na.source # " deforestation alert at " # na.lat.toText() # "," # na.lng.toText() # " (" # na.areaHectares.toText() # " ha)",
            "{}",
          ));
        };
        case (?pa) {
          let psev = deforestationSeverity(pa.confidence, pa.areaHectares);
          let pweight = Common.severityWeight(psev);
          let areaUp = na.areaHectares > pa.areaHectares * 1.10;
          let confUp = na.confidence > pa.confidence + 10;
          if (nweight > pweight) {
            events.add(deforestEvent(
              na.id,
              #escalating,
              nsev,
              na,
              now,
              na.source # " deforestation escalating at " # na.lat.toText() # "," # na.lng.toText() # " — severity " # pweight.toText() # "→" # nweight.toText(),
              "{}",
            ));
          } else if (areaUp or confUp) {
            events.add(deforestEvent(
              na.id,
              #worsening,
              nsev,
              na,
              now,
              na.source # " deforestation worsening at " # na.lat.toText() # "," # na.lng.toText() # " — area " # pa.areaHectares.toText() # "ha→" # na.areaHectares.toText() # "ha",
              "{}",
            ));
          } else {
            events.add(deforestEvent(
              na.id,
              #lingering,
              nsev,
              na,
              now,
              na.source # " deforestation ongoing at " # na.lat.toText() # "," # na.lng.toText() # " (" # na.areaHectares.toText() # " ha)",
              "{}",
            ));
          };
        };
      };
    };

    events.toArray();
  };

  // Merge a batch of newly noticed events into the front of the noticing feed,
  // capping total feed length (most recent first).
  public func prependNoticed(feed : [NoticedEvent], newEvents : [NoticedEvent], maxLen : Nat) : [NoticedEvent] {
    if (newEvents.size() == 0) { return feed };
    let combined = newEvents.concat(feed);
    if (combined.size() <= maxLen) { return combined };
    // Keep the most recent maxLen entries.
    combined.sliceToArray(0, maxLen);
  };

  // Build a human-readable one-line summary for a noticed event.
  public func summarize(event : NoticedEvent) : Text {
    let layerTxt = switch (event.layer) {
      case (#fire) "Fire";
      case (#deforestation) "Deforestation";
    };
    let reasonTxt = switch (event.reason) {
      case (#newEvent) "new";
      case (#worsening) "worsening";
      case (#escalating) "escalating";
      case (#lingering) "lingering";
    };
    let sevTxt = Common.severityWeight(event.severity).toText();
    layerTxt # " (" # sevTxt # "/5) " # reasonTxt # " @ " # event.lat.toText() # "," # event.lng.toText();
  };
};
