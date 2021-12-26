import { expect } from "chai";

let orderDishId: number;
const orderDishExample = {
  amount: 1000,
  dish: "dishId",
  modifiers: '"json"',
  order: "orderId",
  discount: '"json"',
  parent: 1,
  uniqueItems: 5,
  itemTotal: 5,
  discountTotal: 100,
  comment: "comment",
  addedBy: "test",
  weight: 400,
  totalWeight: 600,
};

describe("OrderDish", function () {
  
  it("create", async function () {
    const orderDish = await OrderDish.create(orderDishExample).fetch();
    orderDishId = orderDish.id;
    expect(orderDish).to.include.all.keys(
      "amount",
      "dish",
      "modifiers",
      "order",
      "discount",
      "parent",
      "uniqueItems",
      "itemTotal",
      "discountTotal",
      "comment",
      "addedBy",
      "weight",
      "totalWeight"
    );
  });
});
