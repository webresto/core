import { expect } from "chai";
import MenuAdapter from "../../adapters/menu/MenuAdapter";
import { DefaultMenuAdapter } from "../../adapters/menu/default/defaultMenu";
import { KitchenResolution } from "../../interfaces/Menu";

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
        order: { cookingPoints: ["center"] },
      });
      expect(context.placeIds).to.deep.equal(["north"]);
      expect(context.source).to.equal("requested");
    });

    it("prefers the order's kitchen over the default", async function () {
      bindGlobals({ DEFAULT_COOKING_PLACE: "center" }, [center, north]);
      const order = { cookingPoints: ["north", "center"] };
      const context = await new DefaultMenuAdapter().resolveContext({ order });
      expect(context.placeIds).to.deep.equal(["north"]);
      expect(context.source).to.equal("order");
      expect(context.order).to.equal(order);
    });
  });

  describe("kitchen for a coordinate", function () {
    it("reads the menu at the kitchen the adapter's own resolveCookingPlace names", async function () {
      bindGlobals({ DEFAULT_COOKING_PLACE: "center" }, [center, north]);
      class NorthOnly extends DefaultMenuAdapter {
        async resolveCookingPlace(): Promise<KitchenResolution> {
          return { placeId: "north", strategy: null, diagnostics: ["north only"] };
        }
      }
      const context = await new NorthOnly().resolveContext({ coordinate: { lat: 56.84, lon: 60.61 } });
      expect(context.placeIds).to.deep.equal(["north"]);
      expect(context.source).to.equal("coordinate");
    });
  });

  describe("single-place mode of the default adapter", function () {
    it("requires a point in every outcome", async function () {
      bindGlobals({ DEFAULT_COOKING_PLACE: "center", MENU_PLACE_BASED_MODE: "single-place" }, [center, north]);
      const adapter = new DefaultMenuAdapter();
      expect((await adapter.resolveContext({ cookingPointId: "north" })).placeRequired).to.equal(true);
      expect((await adapter.resolveContext({ order: { cookingPoints: ["north"] } })).placeRequired).to.equal(true);
      expect((await adapter.resolveContext({})).placeRequired).to.equal(true);
    });

    it("falls back to the installation default before refusing", async function () {
      bindGlobals({ DEFAULT_COOKING_PLACE: "center", MENU_PLACE_BASED_MODE: "single-place" }, [center, north]);
      const context = await new DefaultMenuAdapter().resolveContext({});
      expect(context.placeIds).to.deep.equal(["center"]);
      expect(context.source).to.equal("default");
      expect(context.code).to.equal(undefined);
    });

    it("refuses rather than reading unlimited stock when no point can be found", async function () {
      bindGlobals({ DEFAULT_COOKING_PLACE: "", MENU_PLACE_BASED_MODE: "single-place" }, [center, north]);
      const context = await new DefaultMenuAdapter().resolveContext({});
      expect(context.placeIds).to.deep.equal([]);
      expect(context.code).to.equal("MENU_PLACE_REQUIRED");
    });

    it("does not resolve a kitchen from the coordinate", async function () {
      bindGlobals({ DEFAULT_COOKING_PLACE: "center", MENU_PLACE_BASED_MODE: "single-place" }, [center, north]);
      class NorthOnly extends DefaultMenuAdapter {
        async resolveCookingPlace(): Promise<KitchenResolution> {
          return { placeId: "north", strategy: null, diagnostics: ["north only"] };
        }
      }
      const context = await new NorthOnly().resolveContext({ coordinate: { lat: 56.84, lon: 60.61 } });
      expect(context.placeIds).to.deep.equal(["center"]);
      expect(context.source).to.equal("default");
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
        placeIds: ["center"], source: "default", placeRequired: false, diagnostics: [], order: null,
      });
      expect(filtered.map((p) => p.id)).to.deep.equal(["water"]);
    });

    it("keeps everything when SHOW_UNAVAILABLE_DISHES is on", async function () {
      bindGlobals({ DISH_PLACE_BALANCE_MODE: "minimum", SHOW_UNAVAILABLE_DISHES: true }, [center], [
        { dish: "pizza", place: "center", localBalance: 0, rmsBalance: null, enable: true },
      ]);
      const filtered = await new DefaultMenuAdapter().filterProducts(products, {
        placeIds: ["center"], source: "default", placeRequired: false, diagnostics: [], order: null,
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
      const context = { placeIds: ["center", "north"], source: "default" as const, placeRequired: false, diagnostics: [], order: null };
      const adapter = new DefaultMenuAdapter();

      expect((await adapter.filterProducts(products, context)).map((p) => p.id)).to.deep.equal(["pizza", "water"]);
      const verdict = await adapter.canAddProduct(products[0], 2, context);
      expect(verdict.available).to.equal(true);
      expect(verdict.balance).to.equal(3);
      // Refused everywhere: the point with the most left is the one quoted.
      expect((await adapter.canAddProduct(products[0], 5, context)).reason).to.equal("PRODUCT_NOT_ENOUGH_AT_PLACE");
    });

    it("reads no points as unlimited in default mode and as a refusal in single-place", async function () {
      bindGlobals({ DEFAULT_COOKING_PLACE: "" }, [center, north], []);
      const verdict = await new DefaultMenuAdapter().canAddProduct(
        products[0], 100, { placeIds: [], source: "none", placeRequired: false, diagnostics: [], order: null },
      );
      expect(verdict.available).to.equal(true);
      expect(verdict.balance).to.equal(-1);
      bindGlobals({ DEFAULT_COOKING_PLACE: "", MENU_PLACE_BASED_MODE: "single-place" }, [center, north], []);
      expect((await new DefaultMenuAdapter().resolveContext({})).code).to.equal("MENU_PLACE_REQUIRED");
    });

    it("keeps everything when there is no point", async function () {
      bindGlobals({ DISH_PLACE_BALANCE_MODE: "minimum" }, [center], []);
      const filtered = await new DefaultMenuAdapter().filterProducts(products, {
        placeIds: [], source: "none", placeRequired: false, diagnostics: [], order: null,
      });
      expect(filtered).to.have.length(2);
    });
  });

  describe("placing lines", function () {
    const pizza = { id: "pizza", type: "dish", enable: true };
    const water = { id: "water", type: "product", enable: true };
    const lines = [
      { orderDishId: 1, dish: pizza, amount: 1 },
      { orderDishId: 2, dish: water, amount: 1 },
    ];
    const context = (placeIds: string[]) => ({
      placeIds, source: "order" as const, placeRequired: false, diagnostics: [] as string[], order: null,
    });

    it("keeps the basket on the order's kitchen and judges each line there", async function () {
      bindGlobals({ DISH_PLACE_BALANCE_MODE: "minimum" }, [center], [
        { dish: "pizza", place: "center", localBalance: 0, rmsBalance: null, enable: true },
      ]);
      const placement = await new DefaultMenuAdapter().placeLines(
        { cookingPoints: ["center"] } as any, lines as any, context(["center"]), null,
      );

      expect(placement.placeIds).to.deep.equal(["center"]);
      expect(placement.plan).to.equal(null);
      expect(placement.byOrderDish.get(1)).to.deep.include({ placeId: null });
      expect(placement.byOrderDish.get(1)!.availability.balance).to.equal(0);
      // No stock row for the pair: unlimited, the line passes.
      expect(placement.byOrderDish.get(2)!.availability).to.deep.include({ available: true, balance: -1 });
    });

    it("names no kitchen for an order that has none", async function () {
      bindGlobals({}, [center, north]);
      const placement = await new DefaultMenuAdapter().placeLines({ cookingPoints: [] } as any, lines as any, context([]), null);

      expect(placement.placeIds).to.deep.equal([]);
      expect(placement.byOrderDish.get(1)!.availability.available).to.equal(true);
    });
  });

  describe("delivery", function () {
    it("adds nothing to the delivery a single kitchen cooks for", async function () {
      const delivery = { allowed: true, cost: 150, item: undefined, message: "", deliveryTimeMinutes: 30 };
      expect(await new DefaultMenuAdapter().adjustDelivery({ cookingPoints: ["center", "north"] } as any, delivery)).to.equal(delivery);
    });
  });

  describe("max wait", function () {
    const slow = { id: "slow", type: "dish", enable: true, cookingTimeMax: 45 };
    const untimed = { id: "untimed", type: "dish", enable: true, cookingTimeMax: null as number | null };
    const context = (maxWaitMinutes: number | null) => ({
      placeIds: [] as string[], source: "none" as const, placeRequired: false, diagnostics: [] as string[],
      order: { maxWaitMinutes },
    });

    it("hides a dish that alone cooks longer than the order will wait", async function () {
      bindGlobals({}, [center]);
      const filtered = await new DefaultMenuAdapter().filterProducts([slow, untimed], context(30));
      expect(filtered.map((p) => p.id)).to.deep.equal(["untimed"]);
    });

    it("hides nothing when the order names no ceiling", async function () {
      bindGlobals({}, [center]);
      const filtered = await new DefaultMenuAdapter().filterProducts([slow, untimed], context(null));
      expect(filtered).to.have.length(2);
    });

    it("hides it for an adapter that filters by nothing of its own", async function () {
      bindGlobals({}, [center]);
      class Unfiltered extends MenuAdapter {
        protected async resolvePlaces() {
          return { placeIds: [] as string[], source: "none" as const, placeRequired: false, diagnostics: [] as string[] };
        }
        protected async filterSellable<T>(products: T[]) {
          return products;
        }
      }
      const adapter = new Unfiltered();
      const filtered = await adapter.filterProducts([slow, untimed], await adapter.resolveContext({ order: { maxWaitMinutes: 30 } }));
      expect(filtered.map((p) => p.id)).to.deep.equal(["untimed"]);
    });
  });
});
