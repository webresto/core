"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.groupFields = void 0;
const faker_1 = __importDefault(require("faker"));
var autoincrement = 0;
function groupGenerator(config = {}) {
    autoincrement++;
    return {
        id: faker_1.default.random.uuid(),
        additionalInfo: config.additionalInfo || null,
        code: config.code || null,
        description: faker_1.default.random.words(25),
        parentGroup: config.parentGroup || null,
        sortOrder: autoincrement,
        images: config.images || [],
        name: config.name || `${faker_1.default.commerce.productAdjective()} ${faker_1.default.commerce.productMaterial()} ${Date.now()}`,
        isDeleted: config.isDeleted || false,
        dishes: config.dishes || [],
        visible: config.visible || true,
        slug: faker_1.default.lorem.slug()
    };
}
exports.default = groupGenerator;
exports.groupFields = ["id", "additionalInfo", "code", "description", "order", "images", "name", "isDeleted", "dishes"];
