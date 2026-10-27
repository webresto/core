import { expect } from "chai";
import { resetDatabase } from "../../support/reset";
import { add, lines, newBasket } from "../../support/storefront";

/**
 * The models that assemble a menu read it through the menu adapter's context,
 * so they show what the menu shows: `Dish.getDishes`, `Group.getGroups` down
 * to its child groups, the modifiers of a dish. And the catalog's own methods:
 * finding a group, writing a product or a group from a sync.
 *
 *   City 1: Kitchen 1 and Kitchen 2.
 *   Group 1: Dish 1 (everywhere), Dish 2 (only Kitchen 1), and child Group 2 with
 *   Dish 3 (only Kitchen 1). Group 3 holds Modifier 1, not sold at Kitchen 2;
 *   Dish 4 offers it.
 */
describe("Menu models", function () {
  const k: Record<string, string> = {};
  const g: Record<string, any> = {};
  const d: Record<string, any> = {};

  const group = async (name: string, values: Record<string, unknown> = {}) => Group.create({ name, enable: true, ...values }).fetch();
  const dish = async (name: string, parent: any, values: Record<string, unknown> = {}) =>
    Dish.create({ name, price: 100, enable: true, parentGroup: parent.id, ...values }).fetch();
  const notSoldAtKitchen2 = async (products: any[]) => {
    for (const product of products) await DishPlace.create({ dish: product.id, place: k.kitchen2, localBalance: 0 }).fetch();
  };

  before(async function () {
    await resetDatabase();
    const city = (await City.create({ name: "City 1" }).fetch()).id;
    for (const n of [1, 2]) {
      k[`kitchen${n}`] = (await Place.create({ title: `Kitchen ${n}`, city, enable: true, isCookingPoint: true, isPickupPoint: true }).fetch()).id;
    }
    g.group1 = await group("Group 1");
    g.group2 = await group("Group 2", { parentGroup: g.group1.id });
    g.group3 = await group("Group 3");
    d.dish1 = await dish("Dish 1", g.group1);
    d.dish2 = await dish("Dish 2", g.group1);
    d.dish3 = await dish("Dish 3", g.group2);
    d.modifier1 = await dish("Modifier 1", g.group3, { price: 10, modifier: true });
    d.dish4 = await dish("Dish 4", g.group1, { modifiers: [{ id: g.group3.id, childModifiers: [{ id: d.modifier1.id }] }] });
    await notSoldAtKitchen2([d.dish2, d.dish3, d.modifier1]);
  });

  const contextAt = async (kitchen: string) => (await Adapter.get("menu")).resolveContext({ order: { cookingPoints: [kitchen] } as any });
  const names = (rows: any[]) => rows.map((row) => row.name).sort();
  const modifiersAt = async (product: any, kitchen: string) => {
    const read: any = await Dish.getDishModifiers(await Dish.findOne({ id: product.id }), await contextAt(kitchen));
    return read.modifiers;
  };

  it("Dish.getDishes returns what the menu keeps at the kitchen", async function () {
    expect(names(await Dish.getDishes({ parentGroup: g.group1.id }, await contextAt(k.kitchen1)))).to.deep.equal(["Dish 1", "Dish 2", "Dish 4"]);
    expect(names(await Dish.getDishes({ parentGroup: g.group1.id }, await contextAt(k.kitchen2)))).to.deep.equal(["Dish 1", "Dish 4"]);
  });

  it("Group.getGroups reads its child groups for the same order", async function () {
    const read = async (kitchen: string) => {
      const [group] = (await Group.getGroups([g.group1.id], { cookingPoints: [kitchen] } as any)).groups as any[];
      const child = group.childGroups.find((candidate: any) => candidate.id === g.group2.id);
      return { own: names(group.dishesList), child: names(child?.dishesList ?? []) };
    };

    expect(await read(k.kitchen1)).to.deep.equal({ own: ["Dish 1", "Dish 2", "Dish 4"], child: ["Dish 3"] });
    expect(await read(k.kitchen2)).to.deep.equal({ own: ["Dish 1", "Dish 4"], child: [] });
  });

  it("Dish.getDishModifiers resolves each group and option, and drops the options the kitchen cannot sell", async function () {
    const [group] = await modifiersAt(d.dish4, k.kitchen1);
    expect(group.group.id).to.equal(g.group3.id);
    expect(group.childModifiers.map((option: any) => option.dish.name)).to.deep.equal(["Modifier 1"]);
    // A group left with no option is removed whole.
    expect(await modifiersAt(d.dish4, k.kitchen2)).to.deep.equal([]);
  });

  /**
   * Removing a row must not skip the row after it.
   *
   *   Group 6: Modifier 2 and Modifier 3, neither sold at Kitchen 2.
   *   Group 7: Modifier 4, not sold at Kitchen 2, and Modifier 5.
   *   Group 8: Modifier 6 and Modifier 7, sold everywhere.
   *   Group 9: Modifier 8, not sold at Kitchen 2.
   *   Group 5: Dish 7 offers [6, 7, 8], Dish 8 — [6, 9, 8], Dish 9 — [7, 6, 8].
   *   Group 10: Dish 10 offers Group 8; Modifier 9 and Modifier 10 sit beside it.
   */
  describe("removing a row", function () {
    before(async function () {
      for (const n of [5, 6, 7, 8, 9, 10]) g[`group${n}`] = await group(`Group ${n}`);
      const options: Record<number, number[]> = { 6: [2, 3], 7: [4, 5], 8: [6, 7], 9: [8], 10: [9, 10] };
      for (const [parent, numbers] of Object.entries(options)) {
        for (const n of numbers) d[`modifier${n}`] = await dish(`Modifier ${n}`, g[`group${parent}`], { price: 10, modifier: true });
      }
      await notSoldAtKitchen2([2, 3, 4, 8].map((n) => d[`modifier${n}`]));

      const offer = (n: number) => ({ id: g[`group${n}`].id, childModifiers: options[n].map((option) => ({ id: d[`modifier${option}`].id })) });
      d.dish7 = await dish("Dish 7", g.group5, { modifiers: [offer(6), offer(7), offer(8)] });
      d.dish8 = await dish("Dish 8", g.group5, { modifiers: [offer(6), offer(9), offer(8)] });
      d.dish9 = await dish("Dish 9", g.group5, { modifiers: [offer(7), offer(6), offer(8)] });
      d.dish10 = await dish("Dish 10", g.group10, { modifiers: [offer(8)] });
    });

    const groups = (modifiers: any[]) =>
      modifiers.map((offered: any) => ({ group: offered.group?.name, options: offered.childModifiers.map((option: any) => option.dish?.name) }));

    it("Dish.getDishModifiers removes a group left with no option and still resolves the group after it", async function () {
      const read = async (product: any) => groups(await modifiersAt(product, k.kitchen2));
      const group7 = { group: "Group 7", options: ["Modifier 5"] };
      const group8 = { group: "Group 8", options: ["Modifier 6", "Modifier 7"] };

      expect(await read(d.dish7)).to.deep.equal([group7, group8]);
      // Two empty groups in a row.
      expect(await read(d.dish8)).to.deep.equal([group8]);
      expect(await read(d.dish9)).to.deep.equal([group7, group8]);
    });

    it("Dish.getDishes drops the modifier rows and still resolves the modifiers of the dish beside them", async function () {
      // Two dropped rows and one kept: in whatever order the rows come, a skipped
      // row would either keep a modifier row or leave Dish 10 unresolved.
      const dishes = await Dish.getDishes({ parentGroup: g.group10.id }, await contextAt(k.kitchen1));

      expect(names(dishes)).to.deep.equal(["Dish 10"]);
      expect(groups(dishes[0].modifiers as any[])).to.deep.equal([{ group: "Group 8", options: ["Modifier 6", "Modifier 7"] }]);
    });
  });

  describe("the catalog", function () {
    it("Group.getGroup finds a group by id, and nothing for an id nobody has", async function () {
      expect((await Group.getGroup(g.group1.id)).name).to.equal("Group 1");
      expect(await Group.getGroup("group-9")).to.equal(null);
    });

    it("Group.getGroupBySlug finds a group by its slug, and refuses one nobody has", async function () {
      expect((await Group.getGroupBySlug(g.group1.slug)).id).to.equal(g.group1.id);
      expect(await Group.getGroupBySlug("slug-9").catch((error: unknown) => String(error))).to.contain("not found");
    });

    it("a product and a group created without `enable` are off", async function () {
      const group = await Group.create({ name: "Group 4" }).fetch();
      const dish = await Dish.create({ name: "Dish 6", price: 100, parentGroup: group.id }).fetch();

      expect([group.enable, dish.enable]).to.deep.equal([false, false]);
    });

    it("Group.createOrUpdate updates the group with the same id", async function () {
      const updated = await Group.createOrUpdate({ ...(await Group.findOne({ id: g.group2.id })), name: "Group 2 renamed" });
      expect(updated).to.include({ id: g.group2.id, name: "Group 2 renamed" });
    });

    it("Dish.createOrUpdate creates, updates by id, and leaves a product it has seen unchanged", async function () {
      const values = { id: "dish-5", name: "Dish 5", price: 100, enable: true, parentGroup: g.group1.id } as any;
      const created = await Dish.createOrUpdate(values);
      expect(created).to.include({ id: "dish-5", name: "Dish 5" });

      const again = await Dish.createOrUpdate(values);
      expect(again.hash).to.equal(created.hash);
      expect(again.updatedAt).to.equal(created.updatedAt);

      const renamed = await Dish.createOrUpdate({ ...values, name: "Dish 5 renamed" });
      expect(renamed).to.include({ id: "dish-5", name: "Dish 5 renamed" });
    });
  });
  // whether to show the hidden is the storefront's decision: the menu gives it with the flag
  describe("hidden (visible: false)", function () {
    afterEach(async function () {
      await Dish.update({ id: d.dish1.id }, { visible: true }).fetch();
      await Group.update({ id: { in: [g.group2.id, g.group3.id] } }, { visible: true }).fetch();
    });

    it("a hidden product stays in the menu with its flag", async function () {
      await Dish.update({ id: d.dish1.id }, { visible: false }).fetch();
      const dishes = await Dish.getDishes({ parentGroup: g.group1.id }, await contextAt(k.kitchen1));
      expect(dishes.find((dish) => dish.name === "Dish 1")).to.include({ visible: false });
    });

    it("a hidden group stays among the groups of the menu, the child groups, the tree of the menu", async function () {
      await Group.update({ id: { in: [g.group2.id, g.group3.id] } }, { visible: false }).fetch();
      expect((await Group.getMenuGroups()).find((group) => group.name === "Group 3")).to.include({ visible: false });
      const [group] = (await Group.getGroups([g.group1.id], { cookingPoints: [k.kitchen1] } as any)).groups as any[];
      expect(group.childGroups.map((child: any) => child.id)).to.include(g.group2.id);
      expect(await Group.getMenuTree([g.group1] as any)).to.include(g.group2.id);
    });

    it("a basket keeps a hidden product: its recount does not ask the menu", async function () {
      const id = await newBasket();
      await add(id, d.dish1.id, 2);
      await Dish.update({ id: d.dish1.id }, { visible: false }).fetch();
      await Order.countCart({ id });
      expect(await lines(id)).to.include({ "Dish 1": 2 });
    });
  });
});
