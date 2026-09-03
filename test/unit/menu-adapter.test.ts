import { expect } from "chai";
import { DefaultMenuAdapter } from "../../adapters/menu/default/defaultMenu";
import { SingleKitchenMenuAdapter } from "../../adapters/menu/default/singleKitchenMenu";

describe("menu-adapter", function () {
  const realSettings = (global as any).Settings;
  const realPlace = (global as any).Place;
  const realDishPlace = (global as any).DishPlace;
  const realSails = (global as any).sails;

  const center = { id: "center", isCookingPoint: true, enable: true };
  const north = { id: "north", isCookingPoint: true, enable: true };

  function bindGlobals(settings: Record<string, any>, places: any[], rows: any[] = []) {
    (global as any).Settings = { async get(key: string) { return settings[key]; } };
    (global as any).Place = {
      async find() { return places; },
      async findOne(criteria: { id: string }) { return places.find((p) => p.id === criteria.id); },
    };
    (global as any).DishPlace = { async find() { return rows; } };
    (global as any).sails = { log: { warn: () => undefined, error: () => undefined, info: () => undefined } };
  }

  afterEach(function () {
    (global as any).Settings = realSettings;
    (global as any).Place = realPlace;
    (global as any).DishPlace = realDishPlace;
    (global as any).sails = realSails;
  });

  describe("default adapter", function () {
    it("reads the menu at the installation default point", async function () {
      bindGlobals({ DEFAULT_COOKING_PLACE: "center" }, [center, north]);
      const context = await new DefaultMenuAdapter().resolveContext({});
      expect(context.placeIds).to.deep.equal(["center"]);
      expect(context.source).to.equal("default");
      expect(context.placeRequired).to.equal(false);
    });

    it("never requires a point, even when there is none", async function () {
      bindGlobals({ DEFAULT_COOKING_PLACE: "" }, [center, north]);
      const context = await new DefaultMenuAdapter().resolveContext({});
      expect(context.placeIds).to.deep.equal([]);
      expect(context.source).to.equal("none");
      expect(context.placeRequired).to.equal(false);
      expect(context.code).to.equal(undefined);
    });

    it("prefers a requested point over the order and the default", async function () {
      bindGlobals({ DEFAULT_COOKING_PLACE: "center" }, [center, north]);
      const context = await new DefaultMenuAdapter().resolveContext({
        cookingPointId: "north",
        order: { cookingPoint: "center" },
      });
      expect(context.placeIds).to.deep.equal(["north"]);
      expect(context.source).to.equal("requested");
    });

    it("prefers the order's kitchen over the default", async function () {
      bindGlobals({ DEFAULT_COOKING_PLACE: "center" }, [center, north]);
      const context = await new DefaultMenuAdapter().resolveContext({ order: { cookingPoint: north } });
      expect(context.placeIds).to.deep.equal(["north"]);
      expect(context.source).to.equal("order");
    });
  });

  describe("single-kitchen adapter", function () {
    it("requires a point in every outcome", async function () {
      bindGlobals({ DEFAULT_COOKING_PLACE: "center" }, [center, north]);
      const adapter = new SingleKitchenMenuAdapter();
      expect((await adapter.resolveContext({ cookingPointId: "north" })).placeRequired).to.equal(true);
      expect((await adapter.resolveContext({ order: { cookingPoint: "north" } })).placeRequired).to.equal(true);
      expect((await adapter.resolveContext({})).placeRequired).to.equal(true);
    });

    it("falls back to the installation default before refusing", async function () {
      bindGlobals({ DEFAULT_COOKING_PLACE: "center" }, [center, north]);
      const context = await new SingleKitchenMenuAdapter().resolveContext({});
      expect(context.placeIds).to.deep.equal(["center"]);
      expect(context.source).to.equal("default");
      expect(context.code).to.equal(undefined);
    });

    it("refuses rather than reading unlimited stock when no point can be found", async function () {
      bindGlobals({ DEFAULT_COOKING_PLACE: "" }, [center, north]);
      const context = await new SingleKitchenMenuAdapter().resolveContext({});
      expect(context.placeIds).to.deep.equal([]);
      expect(context.code).to.equal("MENU_PLACE_REQUIRED");
    });
  });

  describe("filtering", function () {
    const products = [
      { id: "pizza", type: "dish", enable: true },
      { id: "water", type: "product", enable: true },
    ];

    it("drops what the point has stopped", async function () {
      bindGlobals({ DISH_PLACE_BALANCE_MODE: "minimum" }, [center], [
        { dish: "pizza", place: "center", localBalance: 0, rmsBalance: null, enable: true },
      ]);
      const adapter = new DefaultMenuAdapter();
      const filtered = await adapter.filterProducts(products, {
        placeIds: ["center"], source: "default", placeRequired: false, diagnostics: [],
      });
      expect(filtered.map((p) => p.id)).to.deep.equal(["water"]);
    });

    it("keeps everything when SHOW_UNAVAILABLE_DISHES is on", async function () {
      bindGlobals({ DISH_PLACE_BALANCE_MODE: "minimum", SHOW_UNAVAILABLE_DISHES: true }, [center], [
        { dish: "pizza", place: "center", localBalance: 0, rmsBalance: null, enable: true },
      ]);
      const filtered = await new DefaultMenuAdapter().filterProducts(products, {
        placeIds: ["center"], source: "default", placeRequired: false, diagnostics: [],
      });
      expect(filtered).to.have.length(2);
    });

    it("keeps a product that only the second point can sell", async function () {
      bindGlobals({ DISH_PLACE_BALANCE_MODE: "minimum" }, [center, north], [
        { dish: "pizza", place: "center", localBalance: 0, rmsBalance: null, enable: true },
        { dish: "pizza", place: "north", localBalance: 3, rmsBalance: null, enable: true },
      ]);
      const stubbed = (global as any).DishPlace;
      (global as any).DishPlace = {
        async find(query: any) {
          const rows = await stubbed.find();
          return rows.filter((row: any) => row.place === query.where.place);
        },
      };
      const context = { placeIds: ["center", "north"], source: "default" as const, placeRequired: false, diagnostics: [] };
      const adapter = new DefaultMenuAdapter();

      expect((await adapter.filterProducts(products, context)).map((p) => p.id)).to.deep.equal(["pizza", "water"]);
      const verdict = await adapter.canAddProduct(products[0], 2, context);
      expect(verdict.available).to.equal(true);
      expect(verdict.balance).to.equal(3);
      expect((await adapter.canAddProduct(products[0], 5, context)).reason).to.equal("PRODUCT_STOPPED_AT_PLACE");
    });

    it("reads no points as unlimited in default mode and as a refusal in single-place", async function () {
      bindGlobals({ DEFAULT_COOKING_PLACE: "" }, [center, north], []);
      const verdict = await new DefaultMenuAdapter().canAddProduct(
        products[0], 100, { placeIds: [], source: "none", placeRequired: false, diagnostics: [] },
      );
      expect(verdict.available).to.equal(true);
      expect(verdict.balance).to.equal(-1);
      expect((await new SingleKitchenMenuAdapter().resolveContext({})).code).to.equal("MENU_PLACE_REQUIRED");
    });

    it("keeps everything when there is no point", async function () {
      bindGlobals({ DISH_PLACE_BALANCE_MODE: "minimum" }, [center], []);
      const filtered = await new DefaultMenuAdapter().filterProducts(products, {
        placeIds: [], source: "none", placeRequired: false, diagnostics: [],
      });
      expect(filtered).to.have.length(2);
    });
  });
});
