import { expect } from "chai";

let cartDishId: string;
const cartDishExample = {
  amount: 1000,
  dish: "dishId",
  modifiers: "json",
  cart: "cartId",
  discount: "json",
  parent: 1,
  uniqueItems: 5,
  itemTotal: 5,
  discountTotal: 100,
  comment: "comment",
  addedBy: "test",
  weight: 400,
  totalWeight: 600,
};

describe("CartDish", function () {
  it("create", async function () {
    const cartDish = await CartDish.create(cartDishExample).fetch();
    cartDishId = cartDish.id;
    expect(cartDish).to.include.all.keys(
      "amount",
      "dish",
      "modifiers",
      "cart",
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
    cartDishExample.modifiers = JSON.parse(cartDishExample.modifiers);
    cartDishExample.discount = JSON.parse(cartDishExample.discount);
    expect(cartDish).to.include(cartDishExample);
  });
  it("find", async function () {
    const cartDish = await CartDish.findOne(cartDishId);
    expect(cartDish).to.include(cartDishExample);
  });
});
