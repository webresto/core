"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.groupFields = void 0;
const faker = require("faker");
//import Group from "../../models/Group"
var autoincrement = 0;
function groupGenerator(config = {}) {
    autoincrement++;
    return {
        id: faker.random.uuid(),
        additionalInfo: config.additionalInfo || null,
        code: config.code || null,
        description: faker.random.words(25),
        parentGroup: config.parentGroup || null,
        order: autoincrement,
        images: config.images || [],
        name: config.name || faker.commerce.productName(),
        tags: [],
        isDeleted: config.isDeleted || false,
        dishesTags: config.dishesTags || [],
        dishes: config.dishes || [],
    };
}
exports.default = groupGenerator;
exports.groupFields = ["id", "additionalInfo", "code", "description", "order", "images", "name", "tags", "isDeleted", "dishesTags", "dishes"];
