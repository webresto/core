"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.dishFields = void 0;
exports.default = dishGenerator;
const faker_1 = __importDefault(require("faker"));
// todo: fix types model instance to {%ModelName%}Record for Dish";
var autoincrement = 0;
// config?: Partial<Dish>
function dishGenerator(config = {
    name: undefined,
    price: undefined,
    concept: undefined,
}) {
    autoincrement++;
    return {
        id: config?.id || faker_1.default.random.uuid(),
        additionalInfo: config?.additionalInfo || "null",
        balance: config?.balance || -1,
        modifiers: config?.modifiers || [],
        parentGroup: config?.parentGroup || null,
        weight: 100,
        price: config?.price === undefined ? faker_1.default.random.number(500) : config.price,
        concept: config.concept,
        sortOrder: autoincrement,
        images: config?.images || [],
        name: config?.name || `${faker_1.default.commerce.productAdjective()} ${faker_1.default.commerce.productMaterial()} ${Date.now()}`,
        description: faker_1.default.random.words(25),
        rmsId: config?.rmsId || faker_1.default.random.uuid(),
        code: null,
        tags: [],
        isDeleted: config?.isDeleted || false
    };
}
exports.dishFields = ["id", "additionalInfo", "balance", "modifiers", "weight", "price", "order", "images", "name", "description", "rmsId", "code", "tags", "isDeleted"];
