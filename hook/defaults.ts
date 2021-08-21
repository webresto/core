import { resolve } from "path";

module.exports.restocore = {
  awaitEmitterTimeout: 2000,
  timeSyncBalance: 30,
  timeSyncMenu: 1200,
  timeSyncStreets: 12,
  timeSyncMap: 900,
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
