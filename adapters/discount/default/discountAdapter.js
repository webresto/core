"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscountAdapter = void 0;
class DiscountAdapter {
    static async apply(order) {
        // Order.concept : string
        // when apply use only discounts from this.discounts
        let discountByConcept = await Discount.getAllByConcept([order.concept]);
        // let discountByConcept: AbstractDiscount[] = await Discount.getAll();
        // console.log(discountByConcept, " discountsaaaaaaaaaaaaaaaaaaaaaaaaa");
        // configuredDiscount if has discount in model but not in this.d
        // isJoint=false discount go first (only one)
        // 
        for (let discount of this.discounts) {
            // if (discount.concept.includes(order.concept))
            if (await discount.condition(order)) {
                await discount.action();
                // console.log("Discount apply action success");
                break;
            }
            //
        }
    }
    // TODO: implement display group and dish discount method
    // rewrite orderDish
    static clear() {
        // await Discounts.clear()
        this.discounts = {};
    }
    // for configured discounts 
    static async addDiscountHandler(discountToAdd) {
        // isDeleted = false
        await Discount.createOrUpdate(discountToAdd);
        // await Discount.setAlive([...id])
        this.discounts[discountToAdd.id] = discountToAdd;
    }
    static async getDiscountHandlerById(id) {
        // let disc: AbstractDiscountHandler = await Discount.getById(id);
        return this.discounts[id];
    }
    static async deleteDiscountHandlerById(id) {
        // isDeleted = true
        await Discount.deleteById(id);
        if (JSON.stringify(this.discounts) !== "{}") {
            let discountKeyToRemove = Object.keys(this.discounts).filter((key) => this.discounts[key].id === id)[0]; // key == id
            if (discountKeyToRemove) {
                delete this.discounts[discountKeyToRemove];
                console.log("Discount with ID: ", id, "deleted successfully.");
            }
        }
    }
    static async getAllStatic() {
        return await Discount.getAll();
    }
    static getInstance(initParams) {
        return DiscountAdapter.prototype;
    }
}
// constructor all discounts isDeleted: true
// public readonly DiscountA: AbstractDiscount;
// protected constructor() {
//   // this.DiscountA = DiscountA;
//   Discount.setDelete();
// }
DiscountAdapter.discounts = {};
exports.DiscountAdapter = DiscountAdapter;
