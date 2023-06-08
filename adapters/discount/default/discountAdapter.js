"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DiscountAdapter = void 0;
// import Discount from "../../../models/Discount";
const configuredDiscount_1 = require("./configuredDiscount");
const worktime_1 = require("@webresto/worktime");
class DiscountAdapter {
    static async apply(order) {
        // Order.concept : string
        // when apply => use only discounts from this.discounts
        let discountByConcept = await Discount.getAllByConcept([order.concept]);
        let filtredDiscountByConcept = discountByConcept.filter(record => {
            if (!record.worktime)
                return true;
            try {
                return (worktime_1.WorkTimeValidator.isWorkNow({ worktime: record.worktime })).workNow;
            }
            catch (error) {
                sails.log.error("Discount > helper > error: ", error);
            }
        });
        // let discountByConcept: AbstractDiscount[] = await Discount.getAll();
        // configuredDiscount if has discount in model but not in this.d
        // isJoint=false discount go first (only one)
        // 
        // for (let discount of discountByConcept) {
        //   // if (discount.concept.includes(order.concept))
        //   if (await discount.condition(order)) {
        //     await discount.action();
        //     break;
        //   }
        //   //
        // }
        await this.checkDiscount(order, filtredDiscountByConcept);
    }
    static async checkDiscount(order, modelDiscounts) {
        let adapterDiscountToApply = Object.values(this.discounts)
            .filter((discount) => {
            return discount.concept.includes(order.concept);
        }).find(async (discount) => {
            // await discount.condition(order)
        });
        // await adapterDiscountToApply.action();
        let modelDiscountToApply = Object.values(modelDiscounts).find(async (discount) => {
            // await discount.condition(order)
        });
        if (adapterDiscountToApply === undefined && modelDiscountToApply === undefined
            || adapterDiscountToApply !== undefined && modelDiscountToApply === undefined) {
            // discount didn't exist anywhere
            // no action if model has no discount we are looking for
            return;
        }
        if (adapterDiscountToApply === undefined && modelDiscountToApply !== undefined) {
            // add in this.d configuredDiscount if has discount in model but not in this.d
            await this.addDiscountHandler(new configuredDiscount_1.default(modelDiscountToApply));
            // await modelDiscountToApply.action()
        }
        if (adapterDiscountToApply !== undefined && modelDiscountToApply !== undefined) {
            // apply action
            // await adapterDiscountToApply.action();
            return;
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
    // public static async deleteDiscountHandlerById(id: string): Promise<void> {
    //   // isDeleted = true
    //   await Discount.deleteById(id);
    //   if (JSON.stringify(this.discounts) !== "{}") {
    //     let discountKeyToRemove: string | undefined = Object.keys(this.discounts).filter((key) => this.discounts[key].id === id)[0]; // key == id
    //     if (discountKeyToRemove) {
    //       delete this.discounts[discountKeyToRemove];
    //       console.log("Discount with ID: ", id, "deleted successfully.");
    //     }
    //   }
    // }
    // public static async getAllStatic(): Promise<AbstractDiscountHandler[]> {
    //   return await Discount.getAll();
    // }
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
