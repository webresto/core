import { expect } from "chai";
import dishGenerator from "../../generators/dish.generator";
import { DishRecord } from "../../../models/Dish";

describe("Order: addDish", function () {
  this.timeout(10000);

  const dishIds = (order: { dishes?: unknown }) =>
    (order.dishes as { dish: DishRecord }[]).map((line) => line.dish.id);

  it("refuses and hides a dish that alone cooks longer than the order will wait", async function () {
    const slow = await Dish.createOrUpdate({ ...dishGenerator({ name: "max-wait slow", price: 100 }), cookingTimeMax: 45 });
    const untimed = await Dish.createOrUpdate(dishGenerator({ name: "max-wait untimed", price: 100 }));
    const order = await Order.create({ id: "test.order.max-wait", maxWaitMinutes: 30 }).fetch();

    const refusal = await Order.addDish({ id: order.id }, slow, 1, [], "", "user").then(() => null, (error) => error);
    expect(refusal?.code).to.equal(25);
    expect(refusal?.error).to.contain("DISH_EXCEEDS_MAX_WAIT");

    await Order.addDish({ id: order.id }, untimed, 1, [], "", "user");
    const populated = await Order.populate({ id: order.id });
    expect(dishIds(populated)).to.deep.equal([untimed.id]);

    const context = await (await Adapter.get("menu")).resolveContext({ order: populated });
    const shown = await Dish.getDishes({ id: [slow.id, untimed.id] }, context);
    expect(shown.map((dish) => dish.id)).to.deep.equal([untimed.id]);
  });

  it("asks for the initialization fields on every product, not only the first", async function () {
    const dish = await Dish.createOrUpdate(dishGenerator({ name: "init fields", price: 100 }));
    const order = await Order.create({ id: "test.order.init-fields", serviceType: "delivery" }).fetch();
    // Already a cart, as after `orderUpdate`: `doCart` will not run for it.
    await Order.next({ id: order.id }, "CART");

    const setFields = (value: string[]) => Settings.set("FIELDS_FOR_ORDER_INITIALIZATION", {
      key: "FIELDS_FOR_ORDER_INITIALIZATION",
      value,
      jsonSchema: { type: "array", items: { type: "string" } },
    } as any);

    await setFields(["address"]);
    try {
      const refusal = await Order.addDish({ id: order.id }, dish, 1, [], "", "user").then(() => null, (error) => error);
      expect(String(refusal?.message)).to.contain("Cart required field error: address");
    } finally {
      await setFields([]);
    }

    await Order.addDish({ id: order.id }, dish, 1, [], "", "user");
    expect(dishIds(await Order.populate({ id: order.id }))).to.deep.equal([dish.id]);
  });
});
