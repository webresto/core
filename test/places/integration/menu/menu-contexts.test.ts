import { expect } from "chai";
import { getEffectiveBalanceAcross } from "../../../../lib/menu/product-availability";
import { MenuContext, MenuRequest } from "../../../../interfaces/Menu";
import { resetDatabase, withSettings } from "../../support/reset";

/**
 * What the menu shows in every context an order can be in, and that it never
 * shows what the basket would refuse: for each product, "in the menu" is
 * "can be added", and the stock the menu reports is the ceiling the basket
 * enforces.
 *
 * Before a kitchen the menu is an intersection: with no city, of every kitchen
 * of every city; with a city, of that city's kitchens. With a kitchen, that
 * kitchen's stock.
 *
 *              Kitchen 1  Kitchen 2  Kitchen 3
 *   Dish 1     ∞          ∞          ∞          everywhere
 *   Dish 2     ∞          0          0          only Kitchen 1
 *   Dish 3     ∞          ∞          0          not in City 2
 *   Dish 4     2          5          ∞          different amounts
 *   Dish 5     ∞          ∞          ∞          cooks for 60 minutes
 *
 *   City 1: Kitchen 1 in Zone 1, Kitchen 2 in Zone 2. City 2: Kitchen 3, no zones.
 */
describe("Menu contexts", function () {
  const ALL = ["Dish 1", "Dish 2", "Dish 3", "Dish 4", "Dish 5"];
  const IN_ZONE_1 = { lat: 10.0, lon: 10.01 };
  /** In City 1, in no zone; Kitchen 2 is the nearer kitchen. */
  const OUTSIDE = { lat: 10.0, lon: 10.4 };

  const k: Record<string, string> = {};
  const d: Record<string, string> = {};
  let city1: string;

  before(async function () {
    await resetDatabase();
    city1 = (await City.create({ name: "City 1" }).fetch()).id;
    const city2 = (await City.create({ name: "City 2" }).fetch()).id;
    const kitchen = async (title: string, city: string, coordinate: { lat: number; lon: number }) =>
      (await Place.create({ title, city, coordinate, enable: true, isCookingPoint: true, isPickupPoint: true, hasDiningArea: true }).fetch()).id;
    k.kitchen1 = await kitchen("Kitchen 1", city1, { lat: 10.0, lon: 10.0 });
    k.kitchen2 = await kitchen("Kitchen 2", city1, { lat: 10.0, lon: 10.1 });
    k.kitchen3 = await kitchen("Kitchen 3", city2, { lat: 50.0, lon: 50.0 });
    await DeliveryZone.create({ name: "Zone 1", polygon: [[9.9, 9.9], [10.05, 9.9], [10.05, 10.1], [9.9, 10.1], [9.9, 9.9]], deliveryCost: 100, minDeliveryTime: 30 }).fetch();
    await DeliveryZone.create({ name: "Zone 2", polygon: [[10.05, 9.9], [10.2, 9.9], [10.2, 10.1], [10.05, 10.1], [10.05, 9.9]], deliveryCost: 150, minDeliveryTime: 30 }).fetch();

    const group = await Group.create({ name: "Group 1", enable: true }).fetch();
    for (const [n, cookingTimeMax] of [[1, 20], [2, 20], [3, 20], [4, 20], [5, 60]]) {
      d[`dish${n}`] = (await Dish.create({ name: `Dish ${n}`, price: 100, enable: true, parentGroup: group.id, cookingTimeMax }).fetch()).id;
    }
    const stock = (dish: string, place: string, localBalance: number) => DishPlace.create({ dish, place, localBalance }).fetch();
    await stock(d.dish2, k.kitchen2, 0);
    await stock(d.dish2, k.kitchen3, 0);
    await stock(d.dish3, k.kitchen3, 0);
    await stock(d.dish4, k.kitchen1, 2);
    await stock(d.dish4, k.kitchen2, 5);
  });

  const menu = async () => Adapter.get("menu");
  const products = async () => Dish.find({ id: Object.values(d) });
  const contextOf = async (request: MenuRequest) => (await menu()).resolveContext(request);
  const menuOf = async (context: MenuContext) =>
    (await (await menu()).filterProducts(await products(), context)).map((product: any) => product.name).sort();
  const menuFor = async (request: MenuRequest) => menuOf(await contextOf(request));
  const kitchenIds = (names: string[]) => names.map((name) => k[name]);

  /** In the menu ⇔ can be added; and the reported stock fits, one more does not. */
  async function expectMenuAgreesWithBasket(context: MenuContext): Promise<void> {
    const adapter = await menu();
    const shown = await menuOf(context);
    for (const product of await products()) {
      const addable = (await adapter.canAddProduct(product, 1, context)).available;
      expect(shown.includes(product.name), `${product.name}: shown ⇔ addable`).to.equal(addable);

      const balance = await getEffectiveBalanceAcross(product.id, context);
      if (!addable || balance === -1) continue;
      expect((await adapter.canAddProduct(product, balance, context)).available, `${product.name}: ${balance} fit`).to.equal(true);
      expect((await adapter.canAddProduct(product, balance + 1, context)).available, `${product.name}: ${balance + 1} do not`).to.equal(false);
    }
  }

  /** Runs `run` with some rows changed, and puts them back after. */
  async function withRows(model: any, changes: Array<[string, Record<string, unknown>]>, run: () => Promise<void>) {
    const saved = await Promise.all(changes.map(async ([id]) => model.findOne({ id })));
    for (const [id, values] of changes) await model.update({ id }, values).fetch();
    try {
      await run();
    } finally {
      for (const row of saved) {
        const restore = Object.fromEntries(Object.keys(changes.find(([id]) => id === row.id)![1]).map((key) => [key, row[key]]));
        await model.update({ id: row.id }, restore).fetch();
      }
    }
  }
  const noKitchenAnywhere = (run: () => Promise<void>) =>
    withRows(Place, Object.values(k).map((id) => [id, { isCookingPoint: false }]), run);

  describe("every context", function () {
    const cases: Array<{ name: string; request: () => MenuRequest; source: string; kitchens: string[]; shown: string[]; dish4: number }> = [
      { name: "no order", request: () => ({}), source: "all", kitchens: ["kitchen1", "kitchen2", "kitchen3"], shown: ["Dish 1", "Dish 4", "Dish 5"], dish4: 2 },
      { name: "an order with no city", request: () => ({ order: { cookingPoints: [] } as any }), source: "all", kitchens: ["kitchen1", "kitchen2", "kitchen3"], shown: ["Dish 1", "Dish 4", "Dish 5"], dish4: 2 },
      { name: "City 1", request: () => ({ order: { address: { city: "City 1" } } as any }), source: "city", kitchens: ["kitchen1", "kitchen2"], shown: ["Dish 1", "Dish 3", "Dish 4", "Dish 5"], dish4: 2 },
      { name: "City 2", request: () => ({ order: { address: { city: "City 2" } } as any }), source: "city", kitchens: ["kitchen3"], shown: ["Dish 1", "Dish 4", "Dish 5"], dish4: -1 },
      { name: "City 1 by its id", request: () => ({ order: { address: { city: city1 } } as any }), source: "city", kitchens: ["kitchen1", "kitchen2"], shown: ["Dish 1", "Dish 3", "Dish 4", "Dish 5"], dish4: 2 },
      { name: "a city nobody knows", request: () => ({ order: { address: { city: "City 9" } } as any }), source: "all", kitchens: ["kitchen1", "kitchen2", "kitchen3"], shown: ["Dish 1", "Dish 4", "Dish 5"], dish4: 2 },
      { name: "Kitchen 1", request: () => ({ order: { cookingPoints: [k.kitchen1], address: { city: "City 1" } } as any }), source: "order", kitchens: ["kitchen1"], shown: ALL, dish4: 2 },
      { name: "Kitchen 2", request: () => ({ order: { cookingPoints: [k.kitchen2] } as any }), source: "order", kitchens: ["kitchen2"], shown: ["Dish 1", "Dish 3", "Dish 4", "Dish 5"], dish4: 5 },
      { name: "Kitchen 3", request: () => ({ order: { cookingPoints: [k.kitchen3] } as any }), source: "order", kitchens: ["kitchen3"], shown: ["Dish 1", "Dish 4", "Dish 5"], dish4: -1 },
      { name: "a pickup at Kitchen 2", request: () => ({ order: { serviceType: "pickup", cookingPoints: [k.kitchen2] } as any }), source: "order", kitchens: ["kitchen2"], shown: ["Dish 1", "Dish 3", "Dish 4", "Dish 5"], dish4: 5 },
      { name: "a point asked for over the order's kitchen", request: () => ({ cookingPointId: k.kitchen2, order: { cookingPoints: [k.kitchen1] } as any }), source: "requested", kitchens: ["kitchen2"], shown: ["Dish 1", "Dish 3", "Dish 4", "Dish 5"], dish4: 5 },
      { name: "a coordinate in Zone 1", request: () => ({ coordinate: IN_ZONE_1 }), source: "coordinate", kitchens: ["kitchen1"], shown: ALL, dish4: 2 },
      { name: "a coordinate outside every zone", request: () => ({ coordinate: OUTSIDE }), source: "coordinate", kitchens: ["kitchen2"], shown: ["Dish 1", "Dish 3", "Dish 4", "Dish 5"], dish4: 5 },
    ];

    for (const c of cases) {
      it(`${c.name}: ${c.shown.join(", ")}`, async function () {
        const context = await contextOf(c.request());

        expect(context.source).to.equal(c.source);
        expect(context.placeIds).to.have.members(kitchenIds(c.kitchens));
        expect(await menuOf(context)).to.deep.equal(c.shown);
        expect(await getEffectiveBalanceAcross(d.dish4, context)).to.equal(c.dish4);
        await expectMenuAgreesWithBasket(context);
      });
    }

    it("a context naming several kitchens reads them as a union", async function () {
      const context = { placeIds: [k.kitchen2, k.kitchen1], source: "order" as const, placeRequired: false, diagnostics: [], order: null };

      expect(await menuOf(context)).to.deep.equal(ALL);
      expect(await getEffectiveBalanceAcross(d.dish4, context)).to.equal(5);
      await expectMenuAgreesWithBasket(context);
    });

    it("narrows as the order learns more: every city ⊆ its city ⊆ its kitchen", async function () {
      const everywhere = await menuFor({});
      for (const [city, kitchen] of [["City 1", k.kitchen1], ["City 1", k.kitchen2], ["City 2", k.kitchen3]]) {
        const inCity = await menuFor({ order: { address: { city } } as any });
        expect(inCity).to.include.members(everywhere);
        expect(await menuFor({ order: { cookingPoints: [kitchen] } as any })).to.include.members(inCity);
      }
    });
  });

  describe("with no kitchen anywhere", function () {
    it("the default mode reads stock as unknown and shows everything", async function () {
      await noKitchenAnywhere(async () => {
        const context = await contextOf({});

        expect(context.source).to.equal("none");
        expect(context.code).to.equal(undefined);
        expect(await menuOf(context)).to.deep.equal(ALL);
        await expectMenuAgreesWithBasket(context);
      });
    });

    it("single-place mode refuses instead", async function () {
      await withSettings({ MENU_PLACE_BASED_MODE: "single-place" }, () => noKitchenAnywhere(async () => {
        const context = await contextOf({});

        expect(context.code).to.equal("MENU_PLACE_REQUIRED");
        expect(context.placeIds).to.deep.equal([]);
      }));
    });
  });

  it("single-place mode does not pick a kitchen by coordinate: the menu waits for the order's", async function () {
    await withSettings({ MENU_PLACE_BASED_MODE: "single-place" }, async () => {
      const context = await contextOf({ coordinate: IN_ZONE_1 });

      expect(context.source).to.equal("all");
      expect(context.placeRequired).to.equal(true);
      expect(await menuOf(context)).to.deep.equal(["Dish 1", "Dish 4", "Dish 5"]);
    });
  });

  describe("stock variants", function () {
    const atKitchen1 = () => contextOf({ order: { cookingPoints: [k.kitchen1] } as any });
    const inCity1 = () => contextOf({ order: { address: { city: "City 1" } } as any });

    it("a row switched off stops the product at that kitchen only", async function () {
      const row = await DishPlace.create({ dish: d.dish1, place: k.kitchen1, enable: false }).fetch();
      try {
        expect(await menuFor({})).to.not.include("Dish 1");
        expect(await menuOf(await inCity1())).to.not.include("Dish 1");
        expect(await menuOf(await atKitchen1())).to.not.include("Dish 1");
        expect(await menuFor({ order: { cookingPoints: [k.kitchen2] } as any })).to.include("Dish 1");
        await expectMenuAgreesWithBasket(await inCity1());
      } finally {
        await DishPlace.destroy({ id: row.id }).fetch();
      }
    });

    it("a product switched off is nowhere, and the basket says why", async function () {
      await withRows(Dish, [[d.dish1, { enable: false }]], async () => {
        const context = await atKitchen1();

        expect(await menuOf(context)).to.not.include("Dish 1");
        const verdict = await (await menu()).canAddProduct(await Dish.findOne({ id: d.dish1 }), 1, context);
        expect(verdict.reason).to.equal("PRODUCT_DISABLED");
      });
    });

    it("an RMS stop counts in the modes that read the RMS", async function () {
      const row = await DishPlace.create({ dish: d.dish1, place: k.kitchen1, rmsBalance: 0 }).fetch();
      try {
        for (const [mode, shown] of [["minimum", false], ["rms-only", false], ["local-only", true]] as const) {
          await withSettings({ DISH_PLACE_BALANCE_MODE: mode }, async () => {
            expect((await menuOf(await atKitchen1())).includes("Dish 1"), mode).to.equal(shown);
            await expectMenuAgreesWithBasket(await atKitchen1());
          });
        }
      } finally {
        await DishPlace.destroy({ id: row.id }).fetch();
      }
    });

    it("the smaller of the operator's and the RMS's stock is the ceiling", async function () {
      const row = await DishPlace.create({ dish: d.dish1, place: k.kitchen2, localBalance: 7, rmsBalance: 3 }).fetch();
      try {
        expect(await getEffectiveBalanceAcross(d.dish1, await contextOf({ order: { cookingPoints: [k.kitchen2] } as any }))).to.equal(3);
        expect(await getEffectiveBalanceAcross(d.dish1, await inCity1())).to.equal(3);
      } finally {
        await DishPlace.destroy({ id: row.id }).fetch();
      }
    });

    it("SHOW_UNAVAILABLE_DISHES shows what the basket still refuses, by design", async function () {
      await withSettings({ SHOW_UNAVAILABLE_DISHES: true }, async () => {
        const context = await contextOf({});

        expect(await menuOf(context)).to.deep.equal(ALL);
        expect((await (await menu()).canAddProduct(await Dish.findOne({ id: d.dish2 }), 1, context)).available).to.equal(false);
      });
    });

    it("a maximum wait hides what alone cooks longer, whatever the kitchens hold", async function () {
      const context = await contextOf({ order: { address: { city: "City 1" }, maxWaitMinutes: 30 } as any });
      expect(await menuOf(context)).to.deep.equal(["Dish 1", "Dish 3", "Dish 4"]);
    });
  });
});
