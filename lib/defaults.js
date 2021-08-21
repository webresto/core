module.exports.restocore = {
  awaitEmitterTimeout: 2000,
  stateflow: {
    Cart: {
      startState: "CART",
      states: {
        CART: ["CHECKOUT"],
        CHECKOUT: ["CART", "PAYMENT", "ORDER"],
        PAYMENT: ["ORDER", "CHECKOUT"],
        ORDER: [],
      }
    }
  }
};
