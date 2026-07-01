module {
  // Cross-cutting types shared across the environmental-noticing domain.

  // Unix epoch milliseconds, matching external API timestamps.
  public type Timestamp = Nat;

  // WGS84 decimal degrees. Latitude [-90, 90], longitude [-180, 180].
  public type Latitude = Float;
  public type Longitude = Float;

  // Geographic point of interest.
  public type GeoPoint = {
    lat : Latitude;
    lng : Longitude;
  };

  // Bounding box used to scope an external fetch region.
  public type BoundingBox = {
    southWest : GeoPoint;
    northEast : GeoPoint;
  };

  // Severity weighting for noticed events. Higher = more urgent.
  // 1 = low / informational, 5 = critical / rapidly worsening.
  public type Severity = {
    #low;        // 1
    #moderate;   // 2
    #high;       // 3
    #severe;     // 4
    #critical;   // 5
  };

  // Numeric severity helper for ordering / weighting.
  public func severityWeight(s : Severity) : Nat {
    switch (s) {
      case (#low) 1;
      case (#moderate) 2;
      case (#high) 3;
      case (#severe) 4;
      case (#critical) 5;
    };
  };

  // Threat layer kind. Structured so additional layers (flood, drought)
  // can be added later as new variant tags without rework.
  public type ThreatLayer = {
    #fire;
    #deforestation;
  };
};
