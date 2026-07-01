import Types "types/environmental-noticing";
import Common "types/common";

// Migration module for the environmental-noticing canister.
//
// The previously deployed backend already owned the five stable fields
// (lastFireSnapshot, lastDeforestationSnapshot, noticedFeed, cycle,
// nextEventId). The new actor keeps the same stable signature, so this is a
// passthrough migration: we consume the old fields explicitly (so the
// runtime does not refuse to discard them with M0169) and re-emit them
// unchanged into the new actor.
//
// OldActor mirrors the previously deployed stable signature.
// NewActor mirrors the new actor's stable fields.

module {
  // Previously deployed stable fields. Names and types match the prior actor.
  public type OldActor = {
    var lastFireSnapshot : ?Types.ThreatSnapshot;
    var lastDeforestationSnapshot : ?Types.ThreatSnapshot;
    var noticedFeed : [Types.NoticedEvent];
    var cycle : Types.CycleStatus;
    var nextEventId : Nat;
  };

  // New stable fields. Names and types match the actor's stable bindings.
  // Mutable (`var`) fields use `var` here to match the actor.
  public type NewActor = {
    var lastFireSnapshot : ?Types.ThreatSnapshot;
    var lastDeforestationSnapshot : ?Types.ThreatSnapshot;
    var noticedFeed : [Types.NoticedEvent];
    var cycle : Types.CycleStatus;
    var nextEventId : Nat;
  };

  // Fresh install: migration is ignored, actor initializers run.
  // Upgrade: passthrough — preserve the previously deployed stable values.
  public func run(old : OldActor) : NewActor {
    {
      var lastFireSnapshot = old.lastFireSnapshot;
      var lastDeforestationSnapshot = old.lastDeforestationSnapshot;
      var noticedFeed = old.noticedFeed;
      var cycle = old.cycle;
      var nextEventId = old.nextEventId;
    };
  };
};
