"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const AbstractDiscount_1 = require("../AbstractDiscount");
class configuredDiscount extends AbstractDiscount_1.default {
    constructor(discount) {
        super();
<<<<<<< HEAD
        this.id = discount.id,
            this.isJoint = discount.isJoint,
            this.name = discount.name,
            this.isPublic = discount.isPublic;
        this.description = discount.description;
        this.concept = discount.concept;
        this.configDiscount = discount.configDiscount;
        this.discount = discount.discount;
        this.discountType = discount.discountType;
        this.actions = discount.actions;
        this.enable = discount.enable;
        this.isDeleted = discount.isDeleted;
        this.sortOrder = discount.sortOrder;
        this.productCategoryDiscounts = discount.productCategoryDiscounts;
        this.hash = discount.hash;
        this.worktime = discount.worktime;
        this.condition = discount.condition;
        this.action = discount.action;
        this.displayGroupDiscount = discount.displayGroupDiscount;
        this.displayGroupDish = discount.displayGroupDish;
    }
    id;
    isJoint;
    name;
    isPublic;
    description;
    concept;
    configDiscount;
    discount;
    discountType;
    actions;
    enable;
    isDeleted;
    sortOrder;
    productCategoryDiscounts;
    hash;
    worktime;
=======
        this.id = discount.id;
        this.isJoint = discount.isJoint,
        ;
    }
>>>>>>> origin/bonuses
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
