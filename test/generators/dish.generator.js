"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mockSet_1 = require("../generators/lib/mockSet");
async function generate() {
    let mock = mockSet_1.MockSet.getInstance().mock(["Dish"]);
    return mock;
}
exports.default = generate;
