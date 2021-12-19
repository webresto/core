import { expect } from "chai";

let cartDishId: number;
const cartDishExample = {
  amount: 1000,
  dish: "dishId",
  modifiers: '"json"',
  cart: "cartId",
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
  });
});