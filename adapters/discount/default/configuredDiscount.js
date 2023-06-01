"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AbstractDiscount_1 = require("../AbstractDiscount");
class configuredDiscount extends AbstractDiscount_1.default {
    constructor(discount) {
        super();
        this.id = discount.id;
        this.isJoint = discount.isJoint,
        ;
    }
    condition(order) {
        throw new Error("Method not implemented.");
    }
    action() {
        throw new Error("Method not implemented.");
    }
    displayGroupDiscount() {
        throw new Error("Method not implemented.");
    }
    displayGroupDish() {
        throw new Error("Method not implemented.");
    }
}
exports.default = configuredDiscount;
