"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.groupFields = void 0;
const faker = require("faker");
var autoincrement = 0;
function groupGenerator(config = {}) {
    autoincrement++;
    return {
        id: faker.random.uuid(),
        additionalInfo: config.additionalInfo || null,
        code: config.code || null,
        description: faker.random.words(25),
        parentGroup: config.parentGroup || null,
        sortOrder: autoincrement,
        images: config.images || [],
        name: config.name || faker.commerce.productName(),
        isDeleted: config.isDeleted || false,
        dishes: config.dishes || [],
        visible: config.visible || true
        // slug: faker.random.uuid()
    };
}
exports.default = groupGenerator;
exports.groupFields = ["id", "additionalInfo", "code", "description", "order", "images", "name", "isDeleted", "dishes"];
