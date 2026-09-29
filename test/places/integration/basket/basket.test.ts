import { expect } from "chai";
import { resetDatabase } from "../../support/reset";
import { lines, newBasket, thrown } from "../../support/storefront";

/**
 * A basket's lines and totals, whatever kitchen it ends up at: what `addDish`,
 * `removeDish`, `setCount`, `setComment` and `clear` do to the lines, how the
 * recount totals them, and the service type. Which products a kitchen allows is
 * in `checkout` and `menu`.
 *
 *   Dish 1: 100, 100 g. Dish 2: 50, 200 g.
 *   Dish 3: 200, 300 g, with a modifier group whose Modifier 1 (10, 5 g) is on by default.
 */
describe("Basket", function () {
  const d: Record<string, any> = {};

  before(async function () {
    await resetDatabase();
    const group = await Group.create({ name: "Group 1", enable: true }).fetch();
    const dish = (name: string, values: Record<string, unknown>) =>
      Dish.create({ name, enable: true, parentGroup: group.id, ...values }).fetch();

    d.dish1 = await dish("Dish 1", { price: 100, weight: 100 });
    d.dish2 = await dish("Dish 2", { price: 50, weight: 200 });
    d.modifier1 = await dish("Modifier 1", { price: 10, weight: 5, modifier: true });
    d.dish3 = await dish("Dish 3", {
      price: 200,
      weight: 300,
      modifiers: [{
        id: "modifier-group-1",
        rmsId: "rms-modifier-group-1",
        childModifiers: [{ id: d.modifier1.id, rmsId: d.modifier1.rmsId, defaultAmount: 1 }],
      }],
    });
  });

  const add = (id: string, dish: any, amount = 1, modifiers: any[] = [], comment = "") =>
    Order.addDish({ id }, dish.id, amount, modifiers, comment, "user");
  const lineOf = async (id: string, dish: any) => (await OrderDish.find({ order: id, dish: dish.id }))[0];

  describe("adding", function () {
    it("puts a line per product with its amount, comment and who added it, and starts the basket", async function () {
      const id = await newBasket();
      expect((await Order.findOne({ id })).state).to.equal("NEW");

      await add(id, d.dish1);
      await add(id, d.dish2, 5, [], "Comment 1");

      expect((await Order.findOne({ id })).state).to.equal("CART");
      expect(await lineOf(id, d.dish1)).to.include({ amount: 1, comment: "", addedBy: "user" });
      expect(await lineOf(id, d.dish2)).to.include({ amount: 5, comment: "Comment 1", addedBy: "user" });
    });

    it("adds to the line of the same product without modifiers instead of starting another", async function () {
      const id = await newBasket();
      await add(id, d.dish1, 2);
      await add(id, d.dish1, 3);
      await add(id, d.dish1, 1, null as any);

      expect(await lines(id)).to.deep.equal({ "Dish 1": 6 });
      expect(await OrderDish.count({ order: id })).to.equal(1);
    });

    it("keeps a line with modifiers apart from the same product without them", async function () {
      const id = await newBasket();
      await add(id, d.dish1, 1, [{ id: d.modifier1.id, rmsId: d.modifier1.rmsId }]);
      await add(id, d.dish1, 2);

      const amounts = (await OrderDish.find({ order: id })).map((line: any) => [line.modifiers.length, line.amount]);
      expect(amounts).to.have.deep.members([[1, 1], [0, 2]]);
    });

    it("puts in a product's default modifiers by itself", async function () {
      const id = await newBasket();
      await add(id, d.dish3);

      expect((await lineOf(id, d.dish3)).modifiers).to.deep.equal([{ id: d.modifier1.id, amount: 1, rmsId: d.modifier1.rmsId }]);
    });
  });

  describe("changing a line", function () {
    let id: string;

    beforeEach(async function () {
      id = await newBasket();
      await add(id, d.dish1, 3);
      await add(id, d.dish2, 1);
    });

    it("removeDish takes amount off a line, and the line goes at zero", async function () {
      await Order.removeDish({ id }, await lineOf(id, d.dish1), 1, false);
      expect(await lines(id)).to.deep.equal({ "Dish 1": 2, "Dish 2": 1 });

      await Order.removeDish({ id }, await lineOf(id, d.dish2), 1, false);
      expect(await lines(id)).to.deep.equal({ "Dish 1": 2 });
    });

    it("setCount sets the amount, recounts the basket, and removes the line at zero", async function () {
      await Order.setCount({ id }, { ...(await lineOf(id, d.dish1)), dish: d.dish1 }, 5);
      expect(await lines(id)).to.deep.equal({ "Dish 1": 5, "Dish 2": 1 });
      expect((await Order.findOne({ id })).basketTotal).to.equal(550);

      await Order.setCount({ id }, { ...(await lineOf(id, d.dish2)), dish: d.dish2 }, 0);
      expect(await lines(id)).to.deep.equal({ "Dish 1": 5 });
    });

    it("setComment writes the line's comment", async function () {
      await Order.setComment({ id }, await lineOf(id, d.dish1), "Comment 2");
      expect((await lineOf(id, d.dish1)).comment).to.equal("Comment 2");
    });

    it("clear empties the basket", async function () {
      await Order.clear({ id });
      expect(await lines(id)).to.deep.equal({});
      expect((await Order.findOne({ id })).dishesCount).to.equal(0);
    });

    it("refuses a line that is not in this basket", async function () {
      const other = await newBasket();
      await add(other, d.dish1);
      const foreign = await lineOf(other, d.dish1);

      expect((await thrown(Order.removeDish({ id }, foreign, 1, false))).code).to.equal(1);
      expect((await thrown(Order.setComment({ id }, foreign, "Comment 3"))).code).to.equal(1);
    });
  });

  describe("totals", function () {
    it("counts lines, units, weight and price, modifiers included", async function () {
      const id = await newBasket();
      await add(id, d.dish1, 5);
      await add(id, d.dish2, 3);
      // With its default Modifier 1.
      await add(id, d.dish3, 1);

      const order = await Order.countCart({ id });

      expect(order.uniqueDishes).to.equal(3);
      expect(order.dishesCount).to.equal(9);
      expect(order.basketTotal).to.equal(5 * 100 + 3 * 50 + (200 + 10));
      expect(order.totalWeight).to.equal(5 * 100 + 3 * 200 + (300 + 5));
    });
  });

  it("setServiceType switches between delivery, pickup and dine-in", async function () {
    const id = await newBasket();
    for (const serviceType of ["pickup", "dine-in", "delivery"] as const) {
      expect((await Order.setServiceType({ id }, serviceType)).serviceType).to.equal(serviceType);
    }
  });
});
