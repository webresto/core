import { resolve } from "path";

module.exports.restocore = {
  awaitEmitterTimeout: 2000,
  timeSyncBalance: 30,
  timeSyncMenu: 1200,
  timeSyncStreets: 12,
  timeSyncMap: 900,
  stateflow: {
    models: {
      order: {
        flowFile: resolve(__dirname, "../stateflow/", "OrderStates.js"),
        startState: "CART",
        states: {
          CART: ["CHECKOUT"],
          CHECKOUT: ["CART", "PAYMENT", "ORDER"],
          PAYMENT: ["CART", "ORDER", "CHECKOUT"],
          ORDER: [],
        },
      },
    },
  },
};
