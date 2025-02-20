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
          NEW: ["CART"],
          CART: ["CHECKOUT", "REJECT"],
          CHECKOUT: ["CART", "PAYMENT", "ORDER", "REJECT"],
          PAYMENT: ["CART", "ORDER", "CHECKOUT", "REJECT"],
          ORDER: ["DONE", "REJECT"],
          DONE: [],
          REJECT: []
        },
      },
    },
  },
};
