/**
 * Node assertions over the compiled order-timing library.
 *
 * Mirrors the mocha suites next to it; mocha does not run here, so this walks
 * the same ground with `assert` against the emitted JavaScript. $BUILD points at
 * the tsc output directory.
 */
const assert = require("assert");
const path = require("path");

const BUILD = process.env.BUILD;
if (!BUILD) throw new Error("set BUILD to the tsc output directory");

function bindSettings(values) {
  globalThis.Settings = { async get(key) { return values[key]; } };
}
bindSettings({});
globalThis.sails = { log: { warn() {}, error() {}, info() {}, silly() {}, debug() {} } };

const T = require(path.join(BUILD, "lib/order-timing.js"));

const DeliveryAdapter = require(path.join(BUILD, "adapters/delivery/DeliveryAdapter.js")).default;

/** The built-in straight-line estimate, with nothing else stubbed. */
class StraightLineDelivery extends DeliveryAdapter {
  async calculate() { return {}; }
  async checkAbility() { return {}; }
}
const adapter = new StraightLineDelivery();

let passed = 0;

// ---- timing modes ----------------------------------------------------------
assert.strictEqual(T.resolveOrderTiming({}).mode, "asap");
assert.strictEqual(T.resolveOrderTiming({}).code, undefined);
passed++;

assert.strictEqual(T.resolveOrderTiming({ date: "2026-09-01 12:00:00" }).mode, "scheduled");
assert.strictEqual(T.resolveOrderTiming({ maxWaitMinutes: 60 }).mode, "asap");
// An empty string is not a scheduled order.
assert.strictEqual(T.resolveOrderTiming({ date: "   " }).mode, "asap");
passed++;

// Both modes at once is refused rather than reconciled.
const both = T.resolveOrderTiming({ date: "2026-09-01 12:00:00", maxWaitMinutes: 60 });
assert.strictEqual(both.code, "ORDER_TIMING_AMBIGUOUS");
passed++;

assert.strictEqual(T.resolveOrderTiming({ maxWaitMinutes: 0 }).code, "ORDER_WAIT_TOO_SHORT");
assert.strictEqual(T.resolveOrderTiming({ maxWaitMinutes: -5 }).code, "ORDER_WAIT_TOO_SHORT");
// Garbage is not a wait: it reads as "no ceiling", not as a refusal.
assert.strictEqual(T.resolveOrderTiming({ maxWaitMinutes: NaN }).code, undefined);
passed++;

// ---- max wait is judged against the upper bound ----------------------------
assert.strictEqual(T.fitsMaxWait({ totalMinutes: 60 }, 60), true);
assert.strictEqual(T.fitsMaxWait({ totalMinutes: 61 }, 60), false);
assert.strictEqual(T.fitsMaxWait({ totalMinutes: 999 }, null), true);
assert.strictEqual(T.fitsMaxWait({ totalMinutes: 999 }, 0), true);
passed++;

// ---- travel estimate -------------------------------------------------------
(async () => {
  const center = { lat: 56.8371, lng: 60.6019 };
  const north = { lat: 56.8907, lng: 60.6103 };

  bindSettings({});
  let travel = await adapter.estimateTravel(center, north);
  assert.strictEqual(travel.source, "haversine");
  // ~6 km at the 20 km/h default is around 18 minutes; assert the band, not the digit.
  assert.ok(travel.distanceKm > 5 && travel.distanceKm < 7, `distance ${travel.distanceKm}`);
  assert.ok(travel.travelMinutes >= 15 && travel.travelMinutes <= 22, `minutes ${travel.travelMinutes}`);
  passed++;

  // A faster city is a shorter trip.
  bindSettings({ DELIVERY_CITY_SPEED_KMH: 60 });
  const fast = await adapter.estimateTravel(center, north);
  assert.ok(fast.travelMinutes < travel.travelMinutes);
  passed++;

  // Zero speed would divide by zero and promise eternity; it reads as unset.
  bindSettings({ DELIVERY_CITY_SPEED_KMH: 0 });
  const zero = await adapter.estimateTravel(center, north);
  assert.strictEqual(zero.travelMinutes, travel.travelMinutes);
  passed++;

  bindSettings({});
  assert.strictEqual(await adapter.estimateTravel(null, north), null);
  assert.strictEqual(await adapter.estimateTravel(center, null), null);
  passed++;

  // An adapter with its own routing answers instead, and everything
  // downstream reads its number. This is the seam that replaced the provider
  // registry; caching a network call is that adapter's business, not this one's.
  class RoutedDelivery extends StraightLineDelivery {
    async estimateTravel() {
      return { distanceKm: 4.2, travelMinutes: 9, source: "routing-api" };
    }
  }
  const routedAdapter = new RoutedDelivery();
  const routed = await routedAdapter.estimateTravel(center, north);
  assert.strictEqual(routed.source, "routing-api");
  assert.strictEqual(routed.travelMinutes, 9);
  passed++;

  // ---- the whole promise ---------------------------------------------------
  const dishes = [
    { id: "a", type: "dish", cookingTimeMax: 20 },
    { id: "b", type: "product", cookingTimeMax: 90 },
  ];

  bindSettings({ DELIVERY_CITY_SPEED_KMH: 60, DELIVERY_SAFETY_MARGIN_MINUTES: 5 });
  let e = await T.estimateDeliveryTime({ products: dishes, kitchen: center, customer: north }, adapter);
  // Only the dish cooks; the product contributes nothing.
  assert.strictEqual(e.preparationMinutes, 20);
  assert.strictEqual(e.safetyMarginMinutes, 5);
  assert.strictEqual(e.totalMinutes, 20 + e.travelMinutes + 5);
  passed++;

  // The adapter's floor holds the delivery leg up, it does not replace the estimate.
  e = await T.estimateDeliveryTime({
    products: dishes, kitchen: center, customer: north, minDeliveryMinutes: 45,
  }, adapter);
  assert.strictEqual(e.totalMinutes, 20 + 45 + 5);
  assert.ok(e.diagnostics.join(" ").includes("held at the floor of 45 min"));
  passed++;

  // A travel time longer than the floor wins.
  e = await T.estimateDeliveryTime({
    products: dishes, kitchen: center, customer: north, minDeliveryMinutes: 2,
  }, adapter);
  assert.strictEqual(e.totalMinutes, 20 + e.travelMinutes + 5);
  passed++;

  // No zone: the installation-wide floor is the one that has always applied.
  bindSettings({ DELIVERY_CITY_SPEED_KMH: 60, MIN_DELIVERY_TIME_IN_MINUTES: 40 });
  e = await T.estimateDeliveryTime({ products: dishes, kitchen: center, customer: north }, adapter);
  assert.strictEqual(e.totalMinutes, 20 + 40 + 0);
  passed++;

  // No coordinates: still an answer, just without a road.
  bindSettings({ DELIVERY_SAFETY_MARGIN_MINUTES: 3 });
  e = await T.estimateDeliveryTime({ products: dishes, kitchen: null, customer: null }, adapter);
  assert.strictEqual(e.travelMinutes, 0);
  assert.strictEqual(e.distanceKm, null);
  assert.strictEqual(e.travelSource, "none");
  assert.strictEqual(e.totalMinutes, 20 + 0 + 3);
  passed++;

  // Nothing cooked at all: the promise is the road plus the margin.
  e = await T.estimateDeliveryTime({
    products: [{ id: "w", type: "product", cookingTimeMax: 99 }], kitchen: null, customer: null,
  }, adapter);
  assert.strictEqual(e.totalMinutes, 3);
  passed++;

  console.log(`order-timing: ${passed} assertion groups passed`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
