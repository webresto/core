"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const faker = require("faker");
//import Dish from "../../models/Dish"
var autoincrement = 0;
function dishGenerator(config = {}) {
    autoincrement++;
    return {
        id: faker.random.uuid(),
        additionalInfo: config.additionalInfo || null,
        balance: config.balance || -1,
        modifiers: config.modifiers || [],
        parentGroup: config.parentGroup || null,
        weight: 100,
        price: config.price || faker.random.number(500),
        order: autoincrement,
        images: config.images || [],
        name: faker.commerce.productName(),
        composition: faker.random.words(25),
        rmsId: 'none',
        code: null,
        tags: [],
        isDeleted: config.isDeleted || false
    };
}
exports.default = dishGenerator;
