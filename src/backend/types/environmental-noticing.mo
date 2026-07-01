import Common "common";

module {
  // Domain-specific types for the environmental-noticing domain.

  // A single active fire detection sourced from NASA FIRMS.
  // Fields mirror the FIRMS CSV/JSON active-fire record, trimmed to what
  // the noticing engine and the frontend globe need.
  public type FireDetection = {
    id : Text;            // composite key: source + lat/lng + acqDate
    lat : Common.Latitude;
    lng : Common.Longitude;
    brightness : Float;   // FIRMS brightness temperature (Kelvin)
    confidence : Nat;     // 0-100
    acqDate : Common.Timestamp; // acquisition time (epoch ms)
    source : Text;        // e.g. "MODIS" or "VIIRS"
  };

  // A deforestation alert / loss pixel sourced from Global Forest Watch
  // (Hansen Global Forest Change). Coordinates + confidence + date.
  public type DeforestationAlert = {
    id : Text;            // composite key: source + lat/lng + alertDate
    lat : Common.Latitude;
    lng : Common.Longitude;
    confidence : Nat;     // 0-100 (GFW confidence where available)
    alertDate : Common.Timestamp; // alert / loss date (epoch ms)
    areaHectares : Float; // estimated loss area for this alert
    source : Text;        // e.g. "GFW" or "Hansen"
  };

  // A snapshot of all current detections for one threat layer at one fetch.
  // Stored as the "previous" state so the diff engine can compare against it.
  public type ThreatSnapshot = {
    layer : Common.ThreatLayer;
    fetchedAt : Common.Timestamp;
    fires : [FireDetection];            // populated when layer == #fire
    deforestation : [DeforestationAlert]; // populated when layer == #deforestation
  };

  // Why a noticed event was recorded. Drives severity weighting.
  public type NoticeReason = {
    #newEvent;        // event appeared since last fetch
    #worsening;       // existing event intensified (brightness/confidence up)
    #escalating;      // event crossed a severity threshold
    #lingering;       // event still active across multiple cycles
  };

  // A noticed event: something the canister noticed on its own and recorded
  // in the noticing feed for the frontend to surface.
  public type NoticedEvent = {
    id : Text;
    layer : Common.ThreatLayer;
    reason : NoticeReason;
    severity : Common.Severity;
    lat : Common.Latitude;
    lng : Common.Longitude;
    noticedAt : Common.Timestamp;
    summary : Text;        // human-readable one-liner for the feed
    payload : Text;        // raw JSON blob tunneled to the frontend for parsing
  };

  // Status of the periodic noticing cycle.
  public type CycleStatus = {
    lastRunAt : ?Common.Timestamp;
    nextRunAt : ?Common.Timestamp;
    lastFireFetchAt : ?Common.Timestamp;
    lastDeforestationFetchAt : ?Common.Timestamp;
    running : Bool;
  };
};
