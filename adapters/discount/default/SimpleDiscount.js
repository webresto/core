"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SimpleDiscount = void 0;
class SimpleDiscount {
    id;
    discount;
    action;
    discountType;
    Condition(order) {
        // for (let key in this.discounts) {
        //   if (this.discounts.hasOwnProperty(key)) {
        //     if (this.discounts[key].discountType === threshold.action) {
        //       return Promise.resolve(true);
        //     }
        //   }
        // }
        throw new Error("Method not implemented.");
    }
    Action() {
        console.log("action: " + this.action);
        return;
    }
}
exports.SimpleDiscount = SimpleDiscount;
