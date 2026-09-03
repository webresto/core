/**
 * Node assertions over the compiled menu adapters.
 *
 * Mirrors `menu-adapter.test.ts`, which is kept in the repository's mocha style;
 * mocha does not run here, so this walks the same ground with `assert` against
 * the emitted JavaScript. Point it at the build directory with $BUILD.
 */
const assert = require("assert");
const path = require("path");

const BUILD = process.env.BUILD;
if (!BUILD) throw new Error("set BUILD to the tsc output directory");

const center = { id: "center", isCookingPoint: true, enable: true };
const north = { id: "north", isCookingPoint: true, enable: true };

function bindGlobals(settings, places, rows) {
  globalThis.Settings = { async get(key) { return settings[key]; } };
  globalThis.Place = {
    async find() { return places; },
    async findOne(criteria) { return places.find((p) => p.id === criteria.id); },
  };
  globalThis.DishPlace = { async find() { return rows || []; } };
  globalThis.sails = { log: { warn() {}, error() {}, info() {}, silly() {} } };
}

bindGlobals({}, []);

const { DefaultMenuAdapter } = require(path.join(BUILD, "adapters/menu/default/defaultMenu.js"));
const { SingleKitchenMenuAdapter } = require(path.join(BUILD, "adapters/menu/default/singleKitchenMenu.js"));

let passed = 0;

(async () => {
  const ctx = (placeIds) => ({ placeIds, source: "default", placeRequired: false, diagnostics: [] });

  // ---- default adapter -----------------------------------------------------
  bindGlobals({ DEFAULT_COOKING_PLACE: "center" }, [center, north]);
  let c = await new DefaultMenuAdapter().resolveContext({});
  assert.deepStrictEqual(c.placeIds, ["center"]);
  assert.strictEqual(c.source, "default");
  assert.strictEqual(c.placeRequired, false);
  passed++;

  // No point configured and two kitchens: nothing is chosen, and that is allowed.
  bindGlobals({ DEFAULT_COOKING_PLACE: "" }, [center, north]);
  c = await new DefaultMenuAdapter().resolveContext({});
  assert.deepStrictEqual(c.placeIds, []);
  assert.strictEqual(c.source, "none");
  assert.strictEqual(c.placeRequired, false);
  assert.strictEqual(c.code, undefined);
  passed++;

  // A single enabled kitchen is chosen without any setting.
  bindGlobals({ DEFAULT_COOKING_PLACE: "" }, [center]);
  assert.deepStrictEqual((await new DefaultMenuAdapter().resolveContext({})).placeIds, ["center"]);
  passed++;

  bindGlobals({ DEFAULT_COOKING_PLACE: "center" }, [center, north]);
  c = await new DefaultMenuAdapter().resolveContext({ cookingPointId: "north", order: { cookingPoint: "center" } });
  assert.deepStrictEqual(c.placeIds, ["north"]);
  assert.strictEqual(c.source, "requested");
  passed++;

  c = await new DefaultMenuAdapter().resolveContext({ order: { cookingPoint: north } });
  assert.deepStrictEqual(c.placeIds, ["north"]);
  assert.strictEqual(c.source, "order");
  passed++;

  // A populated association and a bare id are the same answer.
  c = await new DefaultMenuAdapter().resolveContext({ order: { cookingPoint: "north" } });
  assert.deepStrictEqual(c.placeIds, ["north"]);
  passed++;

  // ---- single-kitchen adapter ---------------------------------------------
  const single = new SingleKitchenMenuAdapter();
  bindGlobals({ DEFAULT_COOKING_PLACE: "center" }, [center, north]);
  assert.strictEqual((await single.resolveContext({ cookingPointId: "north" })).placeRequired, true);
  assert.strictEqual((await single.resolveContext({ order: { cookingPoint: "north" } })).placeRequired, true);
  assert.strictEqual((await single.resolveContext({})).placeRequired, true);
  passed++;

  c = await single.resolveContext({});
  assert.deepStrictEqual(c.placeIds, ["center"]);
  assert.strictEqual(c.source, "default");
  assert.strictEqual(c.code, undefined);
  passed++;

  // Nothing anywhere: a refusal, not unlimited stock.
  bindGlobals({ DEFAULT_COOKING_PLACE: "" }, [center, north]);
  c = await single.resolveContext({});
  assert.deepStrictEqual(c.placeIds, []);
  assert.strictEqual(c.code, "MENU_PLACE_REQUIRED");
  assert.ok(c.diagnostics.join(" ").includes("DEFAULT_COOKING_PLACE"));
  passed++;

  // ---- filtering -----------------------------------------------------------
  const products = [
    { id: "pizza", type: "dish", enable: true },
    { id: "water", type: "product", enable: true },
  ];
  const stopped = [{ dish: "pizza", place: "center", localBalance: 0, rmsBalance: null, enable: true }];

  bindGlobals({ DISH_PLACE_BALANCE_MODE: "minimum" }, [center], stopped);
  let filtered = await new DefaultMenuAdapter().filterProducts(products, ctx(["center"]));
  assert.deepStrictEqual(filtered.map((p) => p.id), ["water"]);
  passed++;

  // Both adapters narrow one point the same way; only the no-point case differs.
  filtered = await single.filterProducts(products, ctx(["center"]));
  assert.deepStrictEqual(filtered.map((p) => p.id), ["water"]);
  passed++;

  bindGlobals({ DISH_PLACE_BALANCE_MODE: "minimum", SHOW_UNAVAILABLE_DISHES: true }, [center], stopped);
  filtered = await new DefaultMenuAdapter().filterProducts(products, ctx(["center"]));
  assert.strictEqual(filtered.length, 2);
  passed++;

  // No point means no stock is known, which is unlimited — the legacy answer.
  bindGlobals({ DISH_PLACE_BALANCE_MODE: "minimum" }, [center], []);
  filtered = await new DefaultMenuAdapter().filterProducts(products, ctx([]));
  assert.strictEqual(filtered.length, 2);
  passed++;

  // An empty list never reaches the stock query.
  let queried = false;
  globalThis.DishPlace = { async find() { queried = true; return []; } };
  assert.deepStrictEqual(await new DefaultMenuAdapter().filterProducts([], ctx(["center"])), []);
  assert.strictEqual(queried, false);
  passed++;

  console.log(`menu-adapter: ${passed} assertion groups passed`);
})().catch((error) => {
  console.error(error);
  process.exit(1);
});
