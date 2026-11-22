import { expect } from "chai";
import { getLimitedStockProducts, getStockProducts } from "../../../../lib/menu/stock-items";
import { resetDatabase, withSettings } from "../../support/reset";
import { thrown } from "../../support/storefront";

/**
 * A dish with variants: the box and its variants are rows of `Dish` (`interfaces/Variants.ts`).
 * Saving the box makes its variants out of the requests of `variants.mappings`, keeps their names
 * and what they share with the box - the modifiers too - and marks deleted those no mapping names. The menu shows the
 * box and none of its variants, and offers the box while one of its variants can be sold. Recommendations are
 * boxes and ordinary dishes; the stock of a kitchen is of variants and ordinary dishes.
 *
 *   Group 1: Dish 1 — the box. Size 20 / 30 cm, Crust none / cheese, without "30 cm + Cheese".
 *   Group 2: Modifier 1.
 */
describe("Dish variants", function () {
  const SIZE = { key: "size", name: "Size", values: [{ value: 20, title: "20 cm" }, { value: 30, title: "30 cm" }] };
  const CRUST = { key: "crust", name: "Crust", values: [{ value: 0, title: "No crust" }, { value: 1, title: "Cheese" }] };
  const requests = () => [
    { values: { size: 20, crust: 0 }, price: 400, isDefault: true },
    { values: { size: 20, crust: 1 }, price: 500 },
    { values: { size: 30, crust: 0 }, price: 700 },
  ];
  const form = (mappings: any[] = requests()) => ({ options: [SIZE, CRUST], mappings });

  let group1: string;
  let group2: string;
  let modifier1: string;

  beforeEach(async function () {
    await resetDatabase();
    group1 = (await Group.create!({ name: "Group 1", enable: true }).fetch()).id as string;
    group2 = (await Group.create!({ name: "Group 2", enable: true }).fetch()).id as string;
    modifier1 = (await Dish.create!({ name: "Modifier 1", price: 10, enable: true, modifier: true, parentGroup: group2 }).fetch()).id as string;
  });

  const ordinary = async (name: string): Promise<any> => Dish.create!({ name, price: 600, enable: true, parentGroup: group1 }).fetch();
  const box = async (values: Record<string, unknown> = {}): Promise<any> =>
    Dish.create!({ name: "Dish 1", price: 0, enable: true, parentGroup: group1, variants: form(), ...values } as any).fetch();
  const save = async (id: string, values: Record<string, unknown>): Promise<any> => (await Dish.update!({ id }, values as any).fetch())[0];
  /** The rows of the variants of a box, the cheapest first. */
  const variantsOf = async (boxId: string): Promise<any[]> => Dish.find!({ where: { parentId: boxId }, sort: "price ASC" });
  const namesOf = async (boxId: string) => (await variantsOf(boxId)).map((row) => row.name);

  it("saving a box creates a variant for every request and writes its id into the request", async function () {
    const created = await box();
    const rows = await variantsOf(created.id);

    expect(rows.map((row) => [row.name, row.price])).to.deep.equal([
      ["Dish 1, 20 cm, No crust", 400],
      ["Dish 1, 20 cm, Cheese", 500],
      ["Dish 1, 30 cm, No crust", 700],
    ]);
    for (const row of rows) expect(row).to.include({ parentId: created.id, parentGroup: group1, enable: true, isDeleted: false });

    // The ids in, the prices out — in the record the save answers with and in the stored one.
    const mappings = [
      { values: { size: 20, crust: 0 }, isDefault: true, rel: rows[0].id },
      { values: { size: 20, crust: 1 }, rel: rows[1].id },
      { values: { size: 30, crust: 0 }, rel: rows[2].id },
    ];
    expect(created.variants.mappings).to.deep.equal(mappings);
    expect(((await Dish.findOne!({ id: created.id })) as any).variants.mappings).to.deep.equal(mappings);
    // The box itself is no variant.
    expect(created.parentId).to.equal(null);
  });

  it("an ordinary dish becomes a box by a save, and the next save creates nothing more", async function () {
    const dish = await ordinary("Dish 1");
    expect(await variantsOf(dish.id)).to.deep.equal([]);

    const saved = await save(dish.id, { variants: form() });
    const ids = (await variantsOf(dish.id)).map((row) => row.id);
    expect(ids).to.have.length(3);
    expect(saved.variants.mappings.map((mapping: any) => mapping.rel)).to.deep.equal(ids);

    await save(dish.id, { description: "Description 1" });
    expect((await variantsOf(dish.id)).map((row) => row.id)).to.deep.equal(ids);
  });

  it("a request next to existing variants creates only its own", async function () {
    const created = await box();
    const ids = (await variantsOf(created.id)).map((row) => row.id);

    const saved = await save(created.id, { variants: form([...created.variants.mappings, { values: { size: 30, crust: 1 }, price: 800 }]) });

    const rows = await variantsOf(created.id);
    expect(rows.slice(0, 3).map((row) => row.id)).to.deep.equal(ids);
    expect(rows[3]).to.include({ name: "Dish 1, 30 cm, Cheese", price: 800 });
    expect(saved.variants.mappings[3]).to.deep.equal({ values: { size: 30, crust: 1 }, rel: rows[3].id });
  });

  it("refuses a request without a price before it creates anything", async function () {
    const dish = await ordinary("Dish 1");

    const error = await thrown(save(dish.id, { variants: form([{ values: { size: 20, crust: 0 }, price: 400 }, { values: { size: 30, crust: 0 } }]) }));

    expect(String(error?.message ?? error)).to.contain('Variant "Dish 1, 30 cm, No crust" has no price');
    expect(await variantsOf(dish.id)).to.deep.equal([]);
  });

  it("gives the modifiers of the box to every variant, at creation and on every save of the box", async function () {
    const modifiers = [{ id: group2, childModifiers: [{ id: modifier1 }] }];
    const created = await box({ modifiers });
    for (const row of await variantsOf(created.id)) expect(row.modifiers, row.name).to.deep.equal(modifiers);

    // They are the box's: what was written at a variant goes at the next save of the box.
    const [first] = await variantsOf(created.id);
    await save(first.id, { modifiers: [] });
    const fewer = [{ id: group2, childModifiers: [] }];
    await save(created.id, { modifiers: fewer });

    for (const row of await variantsOf(created.id)) expect(row.modifiers, row.name).to.deep.equal(fewer);
  });

  it("copies what the box shares with its variants on every save of the box, and leaves the rest of a variant alone", async function () {
    const created = await box();
    const [first] = await variantsOf(created.id);
    await save(first.id, { price: 450, enable: false, description: "Description 1", weight: 300 });

    const worktime = [{ dayOfWeek: "all", start: "10:00", stop: "22:00" }];
    const tags = [{ name: "Tag 1" }];
    await save(created.id, { parentGroup: group2, cookingTimeMax: 25, worktime, tags, type: "product", notForSale: true, concept: "concept1" });

    for (const row of await variantsOf(created.id)) {
      expect(row).to.include({ parentGroup: group2, cookingTimeMax: 25, type: "product", notForSale: true, concept: "concept1" });
      expect(row.worktime).to.deep.equal(worktime);
      expect(row.tags).to.deep.equal(tags);
    }
    expect(await Dish.findOne!({ id: first.id })).to.include({
      name: "Dish 1, 20 cm, No crust", price: 450, enable: false, description: "Description 1", weight: 300,
    });
  });

  it("rebuilds the names of the variants when the box, a title or the order of the attributes changes", async function () {
    const created = await box();

    await save(created.id, { name: "Dish 1a" });
    expect(await namesOf(created.id)).to.deep.equal(["Dish 1a, 20 cm, No crust", "Dish 1a, 20 cm, Cheese", "Dish 1a, 30 cm, No crust"]);

    const renamed = { ...SIZE, values: [{ value: 20, title: "Small" }, { value: 30, title: "Large" }] };
    await save(created.id, { variants: { options: [CRUST, renamed], mappings: created.variants.mappings } });
    expect(await namesOf(created.id)).to.deep.equal(["Dish 1a, No crust, Small", "Dish 1a, Cheese, Small", "Dish 1a, No crust, Large"]);
  });

  it("a variant moved to another combination keeps its row and its price under the new name", async function () {
    const created = await box();
    const [first] = await variantsOf(created.id);

    const moved = created.variants.mappings.map((mapping: any) => (mapping.rel === first.id ? { ...mapping, values: { size: 30, crust: 1 } } : mapping));
    await save(created.id, { variants: form(moved) });

    expect(await Dish.findOne!({ id: first.id })).to.include({ name: "Dish 1, 30 cm, Cheese", price: 400, isDeleted: false });
    expect(await variantsOf(created.id)).to.have.length(3);
  });

  it("marks deleted a variant no mapping names any more, and keeps its row", async function () {
    const created = await box();

    await save(created.id, { variants: form(created.variants.mappings.slice(0, 2)) });

    expect((await variantsOf(created.id)).map((row) => [row.name, row.isDeleted])).to.deep.equal([
      ["Dish 1, 20 cm, No crust", false],
      ["Dish 1, 20 cm, Cheese", false],
      ["Dish 1, 30 cm, No crust", true],
    ]);
  });

  it("a box that is deleted, destroyed or left without `variants` marks all its variants deleted", async function () {
    const deleted = await box({ name: "Dish 1" });
    const destroyed = await box({ name: "Dish 2" });
    const emptied = await box({ name: "Dish 3" });

    await save(deleted.id, { isDeleted: true });
    await Dish.destroy!({ id: destroyed.id }).fetch();
    await save(emptied.id, { variants: null });

    for (const one of [deleted, destroyed, emptied]) {
      expect((await variantsOf(one.id)).map((row) => row.isDeleted), one.name).to.deep.equal([true, true, true]);
    }
  });

  it("`variants` without attributes is stored as no variants: the dish is an ordinary one again", async function () {
    // What the form of the admin panel writes for a dish whose attributes were all removed: it cannot write `null`.
    const created = await box();
    const saved = await save(created.id, { variants: { options: [], mappings: [] } });

    expect(saved.variants).to.equal(null);
    expect((await variantsOf(created.id)).map((row) => row.isDeleted)).to.deep.equal([true, true, true]);
    expect((await Dish.create!({ name: "Dish 2", price: 100, variants: {} } as any).fetch()).variants).to.equal(null);
  });

  it("the menu shows the box and none of its variants", async function () {
    const city = (await City.create!({ name: "City 1" }).fetch()).id;
    await Place.create!({ title: "Kitchen 1", city, enable: true, isCookingPoint: true, isPickupPoint: true }).fetch();
    await box();
    await ordinary("Dish 2");
    const context = await (await Adapter.get("menu")).resolveContext({});
    const names = (rows: any[]) => rows.map((row) => row.name).sort();

    expect(names(await Dish.getDishes({ parentGroup: group1 }, context))).to.deep.equal(["Dish 1", "Dish 2"]);

    const [group] = (await Group.getGroups([group1])).groups as any[];
    expect(names(group.dishesList)).to.deep.equal(["Dish 1", "Dish 2"]);
    expect(names(group.dishes)).to.deep.equal(["Dish 1", "Dish 2"]);
  });

  it("the menu offers the box while one of its variants can be sold, by their stock and switches and not by its own", async function () {
    const city = (await City.create!({ name: "City 1" }).fetch()).id;
    const kitchen1 = (await Place.create!({ title: "Kitchen 1", city, enable: true, isCookingPoint: true, isPickupPoint: true }).fetch()).id as string;
    const created = await box();
    const rows = await variantsOf(created.id);
    const adapter = await Adapter.get("menu");
    const context = await adapter.resolveContext({});
    const offered = async () => (await adapter.filterProducts([(await Dish.findOne!({ id: created.id })) as any], context)).length === 1;
    const inMenu = async () => (await Dish.getDishes({ parentGroup: group1 }, context)).map((row) => row.name);

    // A row of the box, left from when it was an ordinary dish, says nothing.
    await DishPlace.create!({ dish: created.id, place: kitchen1, localBalance: 0 }).fetch();
    expect(await offered(), "the box stopped").to.equal(true);

    for (const row of rows) await DishPlace.create!({ dish: row.id, place: kitchen1, localBalance: 0 }).fetch();
    expect(await offered(), "every variant stopped").to.equal(false);
    expect(await inMenu()).to.deep.equal([]);
    expect(await withSettings({ SHOW_UNAVAILABLE_DISHES: true }, offered), "stopped, and the menu shows stopped dishes").to.equal(true);

    await DishPlace.update!({ dish: rows[0].id, place: kitchen1 }, { localBalance: 3 }).fetch();
    expect(await offered(), "one variant back").to.equal(true);
    expect(await inMenu()).to.deep.equal(["Dish 1"]);

    // A variant switched off or deleted is not sold, whatever its stock - nor shown as stopped.
    await save(rows[0].id, { enable: false });
    expect(await offered(), "that one switched off").to.equal(false);
    await save(rows[1].id, { enable: false });
    await save(rows[2].id, { isDeleted: true });
    expect(await withSettings({ SHOW_UNAVAILABLE_DISHES: true }, offered), "none left on sale").to.equal(false);
  });

  it("recommends the box and never a variant: of a dish and of a group", async function () {
    const created = await box();
    const [variant] = await variantsOf(created.id);
    const dish2 = await ordinary("Dish 2");
    const unique = (rows: any[]) => [...new Set(rows.map((row) => row.name))].sort();

    await Dish.addToCollection!(dish2.id, "recommendations", [created.id, variant.id]);
    expect(unique(await Dish.getRecommended([dish2.id]))).to.deep.equal(["Dish 1"]);

    // A group recommends its dishes and the dishes of the groups it recommends; variants lie in the group of their box.
    await Group.addToCollection!(group2, "recommendedDishes", [created.id, variant.id]);
    await Group.addToCollection!(group2, "recommendations", [group1]);
    expect(unique(await Group.getRecommendedDishes([group2]))).to.deep.equal(["Dish 1", "Dish 2"]);
  });

  it("the stock of a kitchen lists the variants and not the box", async function () {
    const city = (await City.create!({ name: "City 1" }).fetch()).id;
    const kitchen1 = (await Place.create!({ title: "Kitchen 1", city, enable: true, isCookingPoint: true, isPickupPoint: true }).fetch()).id as string;
    const created = await box();
    const [variant] = await variantsOf(created.id);
    await ordinary("Dish 2");

    const { results } = await getStockProducts(kitchen1, { isDeleted: false, parentGroup: group1 });
    expect(results.map((row) => row.name).sort()).to.deep.equal(["Dish 1, 20 cm, Cheese", "Dish 1, 20 cm, No crust", "Dish 1, 30 cm, No crust", "Dish 2"]);

    // The limited ones: a row the box kept from when it was an ordinary dish is not among them.
    await DishPlace.create!({ dish: created.id, place: kitchen1, localBalance: 0 }).fetch();
    await DishPlace.create!({ dish: variant.id, place: kitchen1, localBalance: 2 }).fetch();
    expect((await getLimitedStockProducts(kitchen1)).results.map((row) => [row.name, row.balance])).to.deep.equal([["Dish 1, 20 cm, No crust", 2]]);
  });
});
