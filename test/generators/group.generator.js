"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const faker = require("faker");
//import Group from "../../models/Group"
var autoincrement = 0;
function groupGenerator(config) {
    autoincrement++;
    return {
        id: faker.random.uuid(),
        additionalInfo: config.additionalInfo || null,
        code: config.code || null,
        description: faker.random.words(25),
        parentGroup: config.parentGroup || null,
        order: autoincrement,
        images: config.images || null,
        name: config.name || faker.commerce.productName(),
        tags: null,
        isDeleted: config.isDeleted || false,
        dishesTags: config.dishesTags || null,
        isIncludedInMenu: config.isDeleted || true,
        dishes: config.dishes || null,
        slug: faker.random.uuid()
    };
}
exports.default = groupGenerator;
