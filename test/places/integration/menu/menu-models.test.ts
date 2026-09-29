import { expect } from "chai";
import { resetDatabase } from "../../support/reset";

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

  before(async function () {
    await resetDatabase();
    const city = (await City.create({ name: "City 1" }).fetch()).id;
    for (const n of [1, 2]) {
      k[`kitchen${n}`] = (await Place.create({ title: `Kitchen ${n}`, city, enable: true, isCookingPoint: true, isPickupPoint: true }).fetch()).id;
    }
    g.group1 = await Group.create({ name: "Group 1", enable: true }).fetch();
    g.group2 = await Group.create({ name: "Group 2", enable: true, parentGroup: g.group1.id }).fetch();
    g.group3 = await Group.create({ name: "Group 3", enable: true }).fetch();
    const dish = async (name: string, group: any, values: Record<string, unknown> = {}) =>
      Dish.create({ name, price: 100, enable: true, parentGroup: group.id, ...values }).fetch();
    d.dish1 = await dish("Dish 1", g.group1);
    d.dish2 = await dish("Dish 2", g.group1);
    d.dish3 = await dish("Dish 3", g.group2);
    d.modifier1 = await dish("Modifier 1", g.group3, { price: 10, modifier: true });
    d.dish4 = await dish("Dish 4", g.group1, { modifiers: [{ id: g.group3.id, childModifiers: [{ id: d.modifier1.id }] }] });
    for (const product of [d.dish2, d.dish3, d.modifier1]) await DishPlace.create({ dish: product.id, place: k.kitchen2, localBalance: 0 }).fetch();
  });

  const contextAt = async (kitchen: string) => (await Adapter.get("menu")).resolveContext({ order: { cookingPoints: [kitchen] } as any });
  const names = (rows: any[]) => rows.map((row) => row.name).sort();

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
    const options = async (kitchen: string) => {
      const dish: any = await Dish.getDishModifiers(await Dish.findOne({ id: d.dish4.id }), await contextAt(kitchen));
      return dish.modifiers;
    };

    const [group] = await options(k.kitchen1);
    expect(group.group.id).to.equal(g.group3.id);
    expect(group.childModifiers.map((option: any) => option.dish.name)).to.deep.equal(["Modifier 1"]);
    // A group left with no option is removed whole.
    expect(await options(k.kitchen2)).to.deep.equal([]);
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
});
