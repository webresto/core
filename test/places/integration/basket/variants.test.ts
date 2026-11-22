import { expect } from "chai";
import { resetDatabase } from "../../support/reset";
import { add, lines, newBasket, thrown } from "../../support/storefront";

/**
 * A basket takes a variant and never its box (`interfaces/Variants.ts`). The line's `dish` is the
 * variant — its price, its stock — and `parentDish` is the box. A variant goes with its box: a
 * box switched off, deleted or gone sells none, and a variant the box dropped is deleted and
 * leaves the basket as any deleted dish. A dish that got variants while it lay in a basket leaves
 * it at the recount, and the customer is told. A shared cart keeps the box of a line.
 *
 *   Kitchen 1. Group 1: Dish 1 — a box, Size 20 cm (400) and 30 cm (700); Dish 2 — ordinary, 100.
 */
describe("Basket: a dish with variants", function () {
  const SIZE = { key: "size", name: "Size", values: [{ value: 20, title: "20 cm" }, { value: 30, title: "30 cm" }] };
  let kitchen1: string;
  let box: string;
  let small: string;
  let large: string;
  let dish2: string;

  beforeEach(async function () {
    await resetDatabase();
    const city = (await City.create!({ name: "City 1" }).fetch()).id;
    kitchen1 = (await Place.create!({ title: "Kitchen 1", city, enable: true, isCookingPoint: true, isPickupPoint: true }).fetch()).id as string;
    const group1 = (await Group.create!({ name: "Group 1", enable: true }).fetch()).id as string;
    const created: any = await Dish.create!({
      name: "Dish 1", price: 0, enable: true, parentGroup: group1,
      variants: { options: [SIZE], mappings: [{ values: { size: 20 }, price: 400, isDefault: true }, { values: { size: 30 }, price: 700 }] },
    } as any).fetch();
    box = created.id;
    [small, large] = created.variants.mappings.map((mapping: any) => mapping.rel);
    dish2 = (await Dish.create!({ name: "Dish 2", price: 100, enable: true, parentGroup: group1 }).fetch()).id as string;
  });

  const linesOf = async (id: string) =>
    (await OrderDish.find!({ where: { order: id }, sort: "id ASC" }))
      .map((line: any) => ({ dish: line.dish, parentDish: line.parentDish, amount: line.amount, itemPrice: line.itemPrice }));
  const refusal = async (id: string, dish: string) => String((await thrown(add(id, dish)))?.message);

  it("refuses the box: what is sold is one of its variants", async function () {
    const id = await newBasket();

    expect(await refusal(id, box)).to.contain("has variants");
    expect(await lines(id)).to.deep.equal({});
  });

  it("takes a variant at its own price, and the line remembers the box", async function () {
    const id = await newBasket();
    await add(id, large, 2);
    await add(id, dish2);

    expect(await linesOf(id)).to.deep.equal([
      { dish: large, parentDish: box, amount: 2, itemPrice: 700 },
      { dish: dish2, parentDish: null, amount: 1, itemPrice: 100 },
    ]);
    expect((await Order.findOne!({ id })).basketTotal).to.equal(1500);
  });

  it("keeps two variants of one box as two lines, and adds up the same variant", async function () {
    const id = await newBasket();
    await add(id, small);
    await add(id, large);
    await add(id, small);

    expect(await lines(id)).to.deep.equal({ "Dish 1, 20 cm": 2, "Dish 1, 30 cm": 1 });
    expect(await OrderDish.count!({ order: id })).to.equal(2);
  });

  it("counts the stock of the variant: one on stop does not stop the other", async function () {
    await DishPlace.create!({ dish: large, place: kitchen1, localBalance: 0 }).fetch();
    const id = await newBasket();

    expect(await refusal(id, large)).to.contain("not available");
    await add(id, small);
    expect(await lines(id)).to.deep.equal({ "Dish 1, 20 cm": 1 });
  });

  it("refuses a variant of a box that is switched off, and of one deleted past the hook", async function () {
    const id = await newBasket();

    await Dish.update!({ id: box }, { enable: false }).fetch();
    expect(await refusal(id, small)).to.contain("not on sale");

    // Without `fetch` no hook runs: the box is deleted, its variants are as they were.
    await Dish.update!({ id: box }, { enable: true, isDeleted: true });
    expect(await refusal(id, small)).to.contain("not on sale");
    expect(await lines(id)).to.deep.equal({});
  });

  it("a box deleted or destroyed by a save takes its variants with it: they are refused as deleted", async function () {
    const id = await newBasket();

    await Dish.update!({ id: box }, { isDeleted: true }).fetch();
    expect(await refusal(id, small)).to.contain("is deleted");

    await Dish.destroy!({ id: box }).fetch();
    expect(await refusal(id, large)).to.contain("is deleted");
    expect(await lines(id)).to.deep.equal({});
  });

  it("a variant the box dropped is refused, and the recount takes it out of a basket", async function () {
    const id = await newBasket();
    await add(id, small);
    await add(id, large);

    const stored: any = await Dish.findOne!({ id: box });
    const kept = stored.variants.mappings.filter((mapping: any) => mapping.rel !== large);
    await Dish.update!({ id: box }, { variants: { ...stored.variants, mappings: kept } } as any).fetch();

    expect(await refusal(id, large)).to.contain("is deleted");
    await Order.countCart({ id });
    expect(await lines(id)).to.deep.equal({ "Dish 1, 20 cm": 1 });
  });

  it("the recount drops a variant whose box was switched off", async function () {
    const id = await newBasket();
    await add(id, small);
    await add(id, dish2);

    await Dish.update!({ id: box }, { enable: false }).fetch();
    await Order.countCart({ id });

    expect(await lines(id)).to.deep.equal({ "Dish 2": 1 });
  });

  it("the recount drops a dish that got variants while it lay in the basket, and says so", async function () {
    const id = await newBasket();
    await add(id, dish2);
    await add(id, small);

    await Dish.update!({ id: dish2 }, { variants: { options: [SIZE], mappings: [{ values: { size: 20 }, price: 150 }] } } as any).fetch();
    const order = await Order.countCart({ id });

    expect(await lines(id)).to.deep.equal({ "Dish 1, 20 cm": 1 });
    expect(order.message).to.equal("Some products are not available here and were removed: Dish 2");
    expect(order.basketTotal).to.equal(400);
  });

  it("a shared cart keeps the box of a variant's line", async function () {
    const id = await newBasket();
    await add(id, large);
    await add(id, dish2);

    const snapshot = await Order.share({ id });

    const copied = (await OrderDish.find!({ order: snapshot.id })).map((line: any) => [line.dish, line.parentDish, line.amount]);
    expect(copied).to.have.deep.members([[large, box, 1], [dish2, null, 1]]);
  });
});
