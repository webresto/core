import { resolve } from "path";

module.exports.restocore = {
  awaitEmitterTimeout: 2000,
  stateflow: {
    models: {
      cart: {
        flowFile: resolve(__dirname, "../stateflow/","CartStates.js"),
        startState: "CART",
        states: {
          CART: ["CHECKOUT"],
          CHECKOUT: ["CART", "PAYMENT", "ORDER"],
          PAYMENT: ["ORDER", "CHECKOUT"],
          ORDER: [],
        },
      },
    },
  },
};
