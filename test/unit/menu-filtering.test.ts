import { expect } from "chai";
import { Adapter } from "../../adapters";
import { getEffectiveBalanceAcross } from "../../lib/menu/product-availability";
import { MenuContext, MenuRequest } from "../../interfaces/Menu";
import { COORD, MultiKitchenWorld } from "./support/multi-kitchen-world";

/**
 * What the menu shows, and that it never shows what the basket would refuse.
 *
 * Every context an order can be in is read over the same stock (see
 * `support/multi-kitchen-world`), through each layer that filters a product
 * list: the adapter's filter, `Dish.getDishes`, `Group.getGroups` down to its
 * child groups, and the modifiers of a dish.
 */
describe("menu-filtering", function () {
  let world: MultiKitchenWorld;

  beforeEach(function () {
    world = MultiKitchenWorld.install();
  });

  afterEach(function () {
    world.restore();
  });

  const PRODUCTS = ["A", "B", "C", "D", "S"];
  const products = () => world.db.get("dish").rows.filter((row) => PRODUCTS.includes(row.id)).map((row) => ({ ...row }));

  async function contextOf(request: MenuRequest): Promise<MenuContext> {
    return (await Adapter.get("menu")).resolveContext(request);
  }

  async function menuOf(context: MenuContext): Promise<string[]> {
    return (await (await Adapter.get("menu")).filterProducts(products(), context)).map((product) => String(product.id));
  }

  /** The menu and the basket agree, product by product, and `balance` is the ceiling the basket enforces. */
  async function expectMenuAgreesWithBasket(context: MenuContext): Promise<void> {
    const adapter = await Adapter.get("menu");
    const menu = await menuOf(context);
    for (const product of products()) {
      const addable = (await adapter.canAddProduct(product, 1, context)).available;
      expect(menu.includes(String(product.id)), `${product.id}: shown ⇔ addable`).to.equal(addable);

      const balance = await getEffectiveBalanceAcross(String(product.id), context);
      if (!addable || balance === -1) continue;
      expect((await adapter.canAddProduct(product, balance, context)).available, `${product.id}: ${balance} fit`).to.equal(true);
      expect((await adapter.canAddProduct(product, balance + 1, context)).available, `${product.id}: ${balance + 1} do not`).to.equal(false);
    }
  }

  const cases: Array<{ name: string; request: MenuRequest; source: MenuContext["source"]; placeIds: string[]; menu: string[]; balanceD: number }> = [
    { name: "no order", request: {}, source: "all", placeIds: ["K11", "K12", "K21"], menu: ["A", "D", "S"], balanceD: 2 },
    { name: "an order with no city", request: { order: { cookingPoints: [] } }, source: "all", placeIds: ["K11", "K12", "K21"], menu: ["A", "D", "S"], balanceD: 2 },
    { name: "City One", request: { order: { address: { city: "City One" } } }, source: "city", placeIds: ["K11", "K12"], menu: ["A", "C", "D", "S"], balanceD: 2 },
    { name: "City Two", request: { order: { address: { city: "City Two" } } }, source: "city", placeIds: ["K21"], menu: ["A", "D", "S"], balanceD: -1 },
    { name: "a city by its id", request: { order: { address: { city: "City1" } } }, source: "city", placeIds: ["K11", "K12"], menu: ["A", "C", "D", "S"], balanceD: 2 },
    { name: "an unknown city", request: { order: { address: { city: "Nowhere" } } }, source: "all", placeIds: ["K11", "K12", "K21"], menu: ["A", "D", "S"], balanceD: 2 },
    { name: "kitchen K11", request: { order: { cookingPoints: ["K11"], address: { city: "City One" } } }, source: "order", placeIds: ["K11"], menu: ["A", "B", "C", "D", "S"], balanceD: 2 },
    { name: "kitchen K12", request: { order: { cookingPoints: ["K12"] } }, source: "order", placeIds: ["K12"], menu: ["A", "C", "D", "S"], balanceD: 5 },
    { name: "kitchen K21", request: { order: { cookingPoints: ["K21"] } }, source: "order", placeIds: ["K21"], menu: ["A", "D", "S"], balanceD: -1 },
    { name: "a pickup at K12", request: { order: { serviceType: "pickup", cookingPoints: ["K12"] } }, source: "order", placeIds: ["K12"], menu: ["A", "C", "D", "S"], balanceD: 5 },
    { name: "a requested point over the order's kitchen", request: { cookingPointId: "K12", order: { cookingPoints: ["K11"] } }, source: "requested", placeIds: ["K12"], menu: ["A", "C", "D", "S"], balanceD: 5 },
    { name: "a coordinate in Z11", request: { coordinate: COORD.inZ11 }, source: "coordinate", placeIds: ["K11"], menu: ["A", "B", "C", "D", "S"], balanceD: 2 },
    { name: "a coordinate outside every zone", request: { coordinate: COORD.outside }, source: "coordinate", placeIds: ["K12"], menu: ["A", "C", "D", "S"], balanceD: 5 },
  ];

  describe("every context", function () {
    for (const c of cases) {
      it(`${c.name}: ${c.menu.join(", ")}`, async function () {
        const context = await contextOf(c.request);
        expect(context.source).to.equal(c.source);
        expect(context.placeIds).to.deep.equal(c.placeIds);
        expect(await menuOf(context)).to.deep.equal(c.menu);
        expect(await getEffectiveBalanceAcross("D", context)).to.equal(c.balanceD);
        await expectMenuAgreesWithBasket(context);
      });
    }

    it("a context that names several kitchens reads them as a union", async function () {
      const context = { placeIds: ["K12", "K11"], source: "order" as const, placeRequired: false, diagnostics: [], order: null };
      expect(await menuOf(context)).to.deep.equal(PRODUCTS);
      expect(await getEffectiveBalanceAcross("D", context)).to.equal(5);
      await expectMenuAgreesWithBasket(context);
    });
  });

  describe("single-place mode", function () {
    beforeEach(function () {
      world.settings.set("MENU_PLACE_BASED_MODE", "single-place");
    });

    it("does not pick a kitchen by coordinate: the menu waits for the order's", async function () {
      const context = await contextOf({ coordinate: COORD.inZ11 });
      expect(context.source).to.equal("all");
      expect(context.placeRequired).to.equal(true);
      expect(await menuOf(context)).to.deep.equal(["A", "D", "S"]);
    });

    it("with no kitchen anywhere refuses instead of reading unlimited stock", async function () {
      for (const id of ["K11", "K12", "K21"]) world.setPlace(id, { isCookingPoint: false });
      const context = await contextOf({});
      expect(context.code).to.equal("MENU_PLACE_REQUIRED");
      expect(context.placeIds).to.deep.equal([]);
    });
  });

  it("with no kitchen anywhere, the default mode reads stock as unlimited", async function () {
    for (const id of ["K11", "K12", "K21"]) world.setPlace(id, { isCookingPoint: false });
    const context = await contextOf({});
    expect(context.source).to.equal("none");
    expect(context.code).to.equal(undefined);
    expect(await menuOf(context)).to.deep.equal(PRODUCTS);
    await expectMenuAgreesWithBasket(context);
  });

  it("narrows as the order learns more: every city ⊆ its city ⊆ its kitchen", async function () {
    const menu = async (request: MenuRequest) => menuOf(await contextOf(request));
    const everywhere = await menu({});
    const chains = [
      [{ order: { address: { city: "City One" } } }, { order: { cookingPoints: ["K11"] } }],
      [{ order: { address: { city: "City One" } } }, { order: { cookingPoints: ["K12"] } }],
      [{ order: { address: { city: "City Two" } } }, { order: { cookingPoints: ["K21"] } }],
    ];
    for (const [city, kitchen] of chains) {
      const inCity = await menu(city);
      const atKitchen = await menu(kitchen);
      expect(inCity).to.include.members(everywhere);
      expect(atKitchen).to.include.members(inCity);
    }
  });

  describe("stock variants", function () {
    it("a disabled row stops the product at that kitchen only", async function () {
      world.db.get("dishplace").seed([{ dish: "A", place: "K11", localBalance: null, rmsBalance: null, enable: false }]);

      expect(await menuOf(await contextOf({}))).to.not.include("A");
      expect(await menuOf(await contextOf({ order: { address: { city: "City One" } } }))).to.not.include("A");
      expect(await menuOf(await contextOf({ order: { cookingPoints: ["K11"] } }))).to.not.include("A");
      expect(await menuOf(await contextOf({ order: { cookingPoints: ["K12"] } }))).to.include("A");
      await expectMenuAgreesWithBasket(await contextOf({ order: { address: { city: "City One" } } }));
    });

    it("a disabled product is nowhere, and the basket says why", async function () {
      world.db.get("dish").rows.find((row) => row.id === "A")!.enable = false;
      const context = await contextOf({ order: { cookingPoints: ["K11"] } });

      expect(await menuOf(context)).to.not.include("A");
      const verdict = await (await Adapter.get("menu")).canAddProduct(products().find((p) => p.id === "A")!, 1, context);
      expect(verdict.reason).to.equal("PRODUCT_DISABLED");
    });

    it("an RMS stop counts in the modes that read the RMS", async function () {
      world.db.get("dishplace").seed([{ dish: "A", place: "K11", localBalance: null, rmsBalance: 0, enable: true }]);
      const atK11 = await contextOf({ order: { cookingPoints: ["K11"] } });

      for (const [mode, shown] of [["minimum", false], ["rms-only", false], ["local-only", true]] as const) {
        world.settings.set("DISH_PLACE_BALANCE_MODE", mode);
        expect((await menuOf(atK11)).includes("A"), mode).to.equal(shown);
        await expectMenuAgreesWithBasket(atK11);
      }
    });

    it("the smaller of the operator and the RMS stock is the ceiling", async function () {
      world.db.get("dishplace").seed([{ dish: "A", place: "K12", localBalance: 7, rmsBalance: 3, enable: true }]);
      expect(await getEffectiveBalanceAcross("A", await contextOf({ order: { cookingPoints: ["K12"] } }))).to.equal(3);
      expect(await getEffectiveBalanceAcross("A", await contextOf({ order: { address: { city: "City One" } } }))).to.equal(3);
    });

    it("SHOW_UNAVAILABLE_DISHES shows what the basket still refuses, by design", async function () {
      world.settings.set("SHOW_UNAVAILABLE_DISHES", true);
      const context = await contextOf({});
      expect(await menuOf(context)).to.deep.equal(PRODUCTS);
      const b = products().find((p) => p.id === "B")!;
      expect((await (await Adapter.get("menu")).canAddProduct(b, 1, context)).available).to.equal(false);
    });

    it("a maximum wait hides what alone cooks longer, whatever the kitchens hold", async function () {
      const context = await contextOf({ order: { address: { city: "City One" }, maxWaitMinutes: 30 } });
      expect(await menuOf(context)).to.deep.equal(["A", "C", "D"]);
    });
  });

  describe("the models that filter", function () {
    beforeEach(function () {
      world.db.get("group").seed([{ id: "GC", name: "Child", slug: "child", parentGroup: "G", isDeleted: false, enable: true, visible: true, sortOrder: 1 }]);
      world.db.get("dish").seed([{
        id: "B2", name: "B2", price: 100, weight: 1, type: "dish", enable: true, isDeleted: false, visible: true,
        modifier: false, notForSale: false, cookingTimeMax: 20, modifiers: [], parentGroup: "GC",
      }]);
      world.setStock("B2", "K12", 0);
      world.setStock("B2", "K21", 0);
    });

    it("Dish.getDishes returns what the adapter's filter keeps", async function () {
      for (const c of cases) {
        const context = await contextOf(c.request);
        const dishes = await Dish.getDishes({ parentGroup: "G" }, context);
        expect(dishes.map((dish: any) => dish.id).sort(), c.name).to.deep.equal(c.menu);
      }
    });

    it("Group.getGroups reads its child groups for the same order", async function () {
      const read = async (order: MenuRequest["order"]) => {
        const { groups } = await Group.getGroups(["G"], order);
        const group: any = groups[0];
        return {
          own: group.dishesList.map((dish: any) => dish.id).sort(),
          child: group.childGroups[0].dishesList.map((dish: any) => dish.id),
        };
      };

      expect(await read({ address: { city: "City One" } })).to.deep.equal({ own: ["A", "C", "D", "S"], child: [] });
      expect(await read({ cookingPoints: ["K11"] })).to.deep.equal({ own: PRODUCTS, child: ["B2"] });
    });

    it("Dish.getDishModifiers drops the options the context cannot sell", async function () {
      world.db.get("group").seed([{ id: "GM", name: "Options", slug: "options", isDeleted: false, enable: true, visible: true }]);
      world.db.get("dish").seed([{
        id: "M", name: "M", price: 10, type: "dish", enable: true, isDeleted: false, visible: true, modifier: true,
        parentGroup: "GM", modifiers: [],
      }]);
      world.setStock("M", "K12", 0);
      const withOption = () => ({ ...products().find((p) => p.id === "A")!, modifiers: [{ id: "GM", childModifiers: [{ id: "M" }] }] });
      const options = async (request: MenuRequest) =>
        // A group left with no option is removed whole.
        (((await Dish.getDishModifiers(withOption() as any, await contextOf(request))) as any).modifiers[0]?.childModifiers ?? []).map((m: any) => m.id);

      expect(await options({ order: { cookingPoints: ["K11"] } })).to.deep.equal(["M"]);
      expect(await options({ order: { address: { city: "City One" } } })).to.deep.equal([]);
      expect(await options({ order: { cookingPoints: ["K12"] } })).to.deep.equal([]);
    });
  });
});
