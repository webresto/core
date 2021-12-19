"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
module.exports.restocore = {
    awaitEmitterTimeout: 2000,
    timeSyncBalance: 30,
    timeSyncMenu: 1200,
    timeSyncStreets: 12,
    timeSyncMap: 900,
    stateflow: {
        models: {
            cart: {
                flowFile: path_1.resolve(__dirname, "../stateflow/", "CartStates.js"),
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
