/**
 * Node assertions over the compiled `lib/product-availability.js`.
 *
 * The mocha suite next to this file is the one kept in the repository style;
 * mocha does not run here, so this walks the same ground with `assert` against
 * the emitted JavaScript. Point it at the build directory with $BUILD.
 */
const assert = require("assert");
const path = require("path");

const BUILD = process.env.BUILD || path.join(require("os").tmpdir(), "pa-build");

globalThis.Settings = { async get() { return undefined; } };
globalThis.Place = { async findOne() { return undefined; } };
globalThis.DishPlace = { async find() { return []; } };
globalThis.sails = { log: { warn() {}, error() {}, silly() {}, debug() {} } };

const A = require(path.join(BUILD, "product-availability.js"));

let passed = 0;
function check(name, fn) {
  fn();
  passed++;
}

// ---- menu mode -------------------------------------------------------------
check("unknown modes fall back to default", () => {
  assert.strictEqual(A.normalizeMenuPlaceBasedMode(undefined), "default");
  assert.strictEqual(A.normalizeMenuPlaceBasedMode(""), "default");
  assert.strictEqual(A.normalizeMenuPlaceBasedMode("nonsense"), "default");
  assert.strictEqual(A.normalizeMenuPlaceBasedMode(["single-place"]), "default");
  assert.strictEqual(A.normalizeMenuPlaceBasedMode(null), "default");
});

check("declared modes survive", () => {
  assert.strictEqual(A.normalizeMenuPlaceBasedMode("default"), "default");
  assert.strictEqual(A.normalizeMenuPlaceBasedMode("single-place"), "single-place");
  assert.strictEqual(A.normalizeMenuPlaceBasedMode("multi-place-route"), "multi-place-route");
});

check("only the default mode needs no point", () => {
  assert.strictEqual(A.modeRequiresPlace("default"), false);
  assert.strictEqual(A.modeRequiresPlace("single-place"), true);
  assert.strictEqual(A.modeRequiresPlace("multi-place-route"), true);
});

// ---- product ---------------------------------------------------------------
const dish = { id: "pizza", type: "dish", enable: true };

check("unlimited stock sells", () => {
  const r = A.evaluateProductAvailability(dish, -1);
  assert.strictEqual(r.available, true);
  assert.strictEqual(r.reason, null);
  assert.strictEqual(r.productId, "pizza");
  assert.strictEqual(r.balance, -1);
});

check("zero balance is a stop at the point", () => {
  const r = A.evaluateProductAvailability(dish, 0);
  assert.strictEqual(r.available, false);
  assert.strictEqual(r.reason, "PRODUCT_STOPPED_AT_PLACE");
});

check("amount above the balance is refused, at the balance it is not", () => {
  assert.strictEqual(A.evaluateProductAvailability(dish, 3, 3).available, true);
  assert.strictEqual(A.evaluateProductAvailability(dish, 3, 4).reason, "PRODUCT_NOT_ENOUGH_AT_PLACE");
  assert.strictEqual(A.evaluateProductAvailability(dish, 3, 4).available, false);
});

check("unlimited stock is never short", () => {
  assert.strictEqual(A.evaluateProductAvailability(dish, -1, 9999).available, true);
});

check("a disabled product outranks stock", () => {
  assert.strictEqual(A.evaluateProductAvailability({ ...dish, enable: false }, -1).reason, "PRODUCT_DISABLED");
  // Disabled is not "out of stock": the reason is what an operator is shown, and
  // the two call for different fixes.
  assert.strictEqual(A.evaluateProductAvailability({ ...dish, enable: false }, 0).reason, "PRODUCT_DISABLED");
});

check("what a catalog row is does not make it unavailable", () => {
  // A `notForSale` product is shown in the menu and rides along at zero; a
  // modifier is not a standalone product. Neither is an availability question,
  // and treating them as one would empty menus that have always shown them.
  assert.strictEqual(A.evaluateProductAvailability({ ...dish, notForSale: true }, -1).available, true);
  assert.strictEqual(A.evaluateProductAvailability({ ...dish, modifier: true }, -1).available, true);
});

check("numeric ids become strings", () => {
  assert.strictEqual(A.evaluateProductAvailability({ id: 42, type: "dish" }, -1).productId, "42");
});

// ---- place -----------------------------------------------------------------
const open = { id: "center", isCookingPoint: true, enable: true };

check("an enabled kitchen with no schedule is open", () => {
  const r = A.evaluatePlaceAvailability(open);
  assert.strictEqual(r.open, true);
  assert.strictEqual(r.reason, null);
  assert.strictEqual(r.placeId, "center");
});

check("no point differs from a disabled point", () => {
  assert.strictEqual(A.evaluatePlaceAvailability(null).reason, "PLACE_NOT_SELECTED");
  assert.strictEqual(A.evaluatePlaceAvailability(undefined).reason, "PLACE_NOT_SELECTED");
  assert.strictEqual(A.evaluatePlaceAvailability({ ...open, enable: false }).reason, "PLACE_DISABLED");
  assert.strictEqual(A.evaluatePlaceAvailability({ ...open, isCookingPoint: false }).reason, "PLACE_DISABLED");
});

check("a schedule closes the kitchen outside it", () => {
  const monday = { ...open, worktime: [{ dayOfWeek: ["monday"], start: "10:00", stop: "20:00" }] };
  // 2026-08-24 is a Monday, 2026-08-23 a Sunday.
  assert.strictEqual(A.evaluatePlaceAvailability(monday, new Date("2026-08-24T12:00:00")).open, true);
  assert.strictEqual(A.evaluatePlaceAvailability(monday, new Date("2026-08-24T23:00:00")).reason, "PLACE_CLOSED");
  assert.strictEqual(A.evaluatePlaceAvailability(monday, new Date("2026-08-23T12:00:00")).reason, "PLACE_CLOSED");
});

check("an empty schedule is not a closed kitchen", () => {
  assert.strictEqual(A.evaluatePlaceAvailability({ ...open, worktime: [] }).open, true);
});

// ---- preparation time ------------------------------------------------------
check("only dishes are cooked", () => {
  assert.strictEqual(A.isCooked({ type: "dish" }), true);
  assert.strictEqual(A.isCooked({ type: undefined }), true);
  assert.strictEqual(A.isCooked({}), true);
  assert.strictEqual(A.isCooked({ type: "product" }), false);
  assert.strictEqual(A.isCooked({ type: "service" }), false);
});

check("nothing cooked means no preparation time", () => {
  assert.strictEqual(A.getPreparationMinutes([]), 0);
  assert.strictEqual(
    A.getPreparationMinutes([
      { id: "water", type: "product", cookingTimeMax: 30 },
      { id: "delivery", type: "service", cookingTimeMax: 50 },
    ]),
    0,
  );
});

check("the slowest line wins, the sum does not", () => {
  assert.strictEqual(
    A.getPreparationMinutes([
      { id: "a", type: "dish", cookingTimeMax: 15 },
      { id: "b", type: "dish", cookingTimeMax: 30 },
    ]),
    30,
  );
});

check("a cooked product with no time adds nothing", () => {
  assert.strictEqual(
    A.getPreparationMinutes([
      { id: "a", type: "dish" },
      { id: "b", type: "dish", cookingTimeMax: 20 },
    ]),
    20,
  );
});

check("nonsense values are ignored, not trusted", () => {
  assert.strictEqual(
    A.getPreparationMinutes([
      { id: "a", type: "dish", cookingTimeMax: 0 },
      { id: "b", type: "dish", cookingTimeMax: NaN },
      { id: "c", type: "dish", cookingTimeMax: 12 },
    ]),
    12,
  );
  assert.strictEqual(
    A.getPreparationMinutes([{ id: "a", type: "dish", cookingTimeMax: "20" }]),
    0,
  );
});

// ---- async paths, against stubbed globals ----------------------------------
(async () => {
  globalThis.Settings = { async get() { return "single-place"; } };
  assert.strictEqual(await A.getMenuPlaceBasedMode(), "single-place");
  passed++;

  globalThis.Settings = { async get() { return "nonsense"; } };
  assert.strictEqual(await A.getMenuPlaceBasedMode(), "default");
  passed++;

  const noPlace = await A.getPlaceAvailability(null);
  assert.strictEqual(noPlace.reason, "PLACE_NOT_SELECTED");
  assert.strictEqual(noPlace.placeId, null);
  passed++;

  globalThis.Place = { async findOne() { return undefined; } };
  const gone = await A.getPlaceAvailability("ghost");
  assert.strictEqual(gone.reason, "PLACE_DISABLED");
  assert.strictEqual(gone.placeId, "ghost");
  passed++;

  globalThis.Place = { async findOne() { return { id: "center", isCookingPoint: true, enable: true }; } };
  assert.strictEqual((await A.getPlaceAvailability("center")).open, true);
  passed++;

  // No stock rows anywhere: every product is unlimited, which is the legacy answer.
  globalThis.Settings = { async get() { return "minimum"; } };
  globalThis.DishPlace = { async find() { return []; } };
  const all = await A.getProductsAvailability([dish, { id: "water", type: "product" }], "center");
  assert.strictEqual(all.size, 2);
  assert.strictEqual(all.get("pizza").available, true);
  assert.strictEqual(all.get("water").balance, -1);
  passed++;

  // A row that says zero stops that one product and leaves the rest alone.
  globalThis.DishPlace = {
    async find() { return [{ dish: "pizza", place: "center", localBalance: 0, rmsBalance: null, enable: true }]; },
  };
  const mixed = await A.getProductsAvailability([dish, { id: "water", type: "product" }], "center");
  assert.strictEqual(mixed.get("pizza").reason, "PRODUCT_STOPPED_AT_PLACE");
  assert.strictEqual(mixed.get("water").available, true);
  passed++;

  // A null point reads no stock at all rather than reading it at some other point.
  let queried = false;
  globalThis.DishPlace = { async find() { queried = true; return []; } };
  const nowhere = await A.getProductsAvailability([dish], null);
  assert.strictEqual(queried, false);
  assert.strictEqual(nowhere.get("pizza").available, true);
  passed++;

  globalThis.DishPlace = {
    async find() { return [{ dish: "pizza", place: "center", localBalance: 2, rmsBalance: null, enable: true }]; },
  };
  assert.strictEqual((await A.getProductAvailability(dish, "center", 2)).available, true);
  assert.strictEqual((await A.getProductAvailability(dish, "center", 3)).reason, "PRODUCT_NOT_ENOUGH_AT_PLACE");
  passed += 2;

  // `enable: false` on the row is an operator stop and beats any balance.
  globalThis.DishPlace = {
    async find() { return [{ dish: "pizza", place: "center", localBalance: 9, rmsBalance: 9, enable: false }]; },
  };
  assert.strictEqual((await A.getProductAvailability(dish, "center")).reason, "PRODUCT_STOPPED_AT_PLACE");
  passed++;

  console.log(`product-availability: ${passed} assertions groups passed`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
