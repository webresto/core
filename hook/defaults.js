"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
module.exports.restocore = {
    awaitEmitterTimeout: 2000,
    stateflow: {
        models: {
            cart: {
                flowFile: path_1.resolve(__dirname, "CartStates.js"),
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
