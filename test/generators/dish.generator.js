"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const faker = require("faker");
var autoincrement = 0;
function dishGenerator(config) {
    autoincrement++;
    console.log(">>>>", config);
    return {
        id: faker.random.uuid(),
        additionalInfo: config.additionalInfo || null,
        balance: config.balance || -1,
        modifiers: config.modifiers || null,
        parentGroup: config.parentGroup || null,
        weight: 100,
        price: config.price || faker.random.number(500),
        order: autoincrement,
        images: config.images || null,
        name: faker.commerce.productName(),
        composition: faker.random.words(25),
        rmsId: null,
        code: null,
        tags: null,
        isDeleted: config.isDeleted || false
    };
}
exports.default = dishGenerator;
