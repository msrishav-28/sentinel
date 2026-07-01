import Types "types/environmental-noticing";
import NoticingMixin "mixins/environmental-noticing-api";
import Migration "migration";
import MixinViews "mo:caffeineai-data-viewer/MixinViews";
import MixinAuthorization "mo:caffeineai-authorization/MixinAuthorization";
import AccessControl "mo:caffeineai-authorization/access-control";
import Timer "mo:core/Timer";
import Int "mo:core/Int";

// Composition root for the environmental-noticing canister.
//
// The actor owns all stable state and delegates every public method to the
// environmental-noticing mixin. No business logic lives here.
//
// State shape (enhanced orthogonal persistence — no `stable` keyword):
//   currentFires / currentDeforestation : latest fetched snapshots
//   lastFireSnapshot / lastDeforestationSnapshot : previous snapshots for diffing
//   noticedFeed : rolling history of noticed events (most recent first)
//   cycle : periodic-cycle bookkeeping
//   nextEventId : monotonic id generator for noticed events
//
// The periodic noticing cycle runs on the canister's own timer (set via the
// system heartbeat / timer mechanism in the develop phase), so the canister
// keeps noticing even with no frontend connected.

(with migration = Migration.run)
actor {
  let currentFires : [Types.FireDetection] = [];
  let currentDeforestation : [Types.DeforestationAlert] = [];

  // Previous snapshots kept as immutable arrays for the diff engine.
  var lastFireSnapshot : ?Types.ThreatSnapshot = null;
  var lastDeforestationSnapshot : ?Types.ThreatSnapshot = null;

  // Noticed-event feed, most recent first. Capped at a max length by the lib.
  var noticedFeed : [Types.NoticedEvent] = [];

  // Cycle bookkeeping.
  var cycle : Types.CycleStatus = {
    lastRunAt = null;
    nextRunAt = null;
    lastFireFetchAt = null;
    lastDeforestationFetchAt = null;
    running = false;
  };

  var nextEventId : Nat = 0;

  // Access-control state owned by the actor and shared with the authorization
  // mixin. Records must be passed by reference so mixin mutations propagate.
  let accessControlState = AccessControl.initState();

  // Periodic timer driving the noticing cycle. The canister keeps noticing on
  // its own even with no frontend connected.
  transient var timerId : Nat = 0;

  include MixinAuthorization(accessControlState, null);
  include MixinViews();

  include NoticingMixin({
    var currentFires = currentFires;
    var currentDeforestation = currentDeforestation;
    var lastFireSnapshot = lastFireSnapshot;
    var lastDeforestationSnapshot = lastDeforestationSnapshot;
    var noticedFeed = noticedFeed;
    var cycle = cycle;
    var nextEventId = nextEventId;
  });

  // Lazily start the recurring noticing timer on the first heartbeat, after
  // mixin inclusion has completed and bound runNoticingCycle.
  system func heartbeat() : async () {
    if (timerId == 0) {
      timerId := Timer.recurringTimer<system>(#nanoseconds(CYCLE_INTERVAL_NS.toNat()), func() : async () {
        await runNoticingCycle();
        ()
      });
    };
  };
};
