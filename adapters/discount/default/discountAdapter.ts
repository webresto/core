import Order from "../../../models/Order";
import AbstractDiscountHandler from "../AbstractDiscount";
// import Discount from "../../../models/Discount";
import configuredDiscount from './configuredDiscount';
import { WorkTimeValidator } from "@webresto/worktime";

export class DiscountAdapter {
  // constructor all discounts isDeleted: true
  // public readonly DiscountA: AbstractDiscount;
  // protected constructor() {
  //   // this.DiscountA = DiscountA;
  //   Discount.setDelete();
  // }

  private static discounts: {[key: string]: AbstractDiscountHandler } = {};

  public static async apply(order: Order): Promise<void> {
    // Order.concept : string
    // when apply => use only discounts from this.discounts
    let discountByConcept: AbstractDiscountHandler[] = await Discount.getAllByConcept([order.concept]);

    let filtredDiscountByConcept = discountByConcept.filter(record => {
      if (!record.worktime) return true;

      try {
          return (WorkTimeValidator.isWorkNow({worktime: record.worktime})).workNow
      } catch (error) {
          sails.log.error("Discount > helper > error: ",error)
      }
    })

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
    await this.checkDiscount(order, filtredDiscountByConcept)

  }

  public static async checkDiscount(order: Order, modelDiscounts: AbstractDiscountHandler[]){

    let adapterDiscountToApply: AbstractDiscountHandler | undefined = Object.values(this.discounts)
      .filter((discount) => {
        return discount.concept.includes(order.concept)
      }).find(async(discount)=>{
        // await discount.condition(order)
      })
    // await adapterDiscountToApply.action();

    let modelDiscountToApply: AbstractDiscountHandler | undefined = Object.values(modelDiscounts).find(async (discount)=>{
      // await discount.condition(order)
    })

    if(adapterDiscountToApply === undefined && modelDiscountToApply === undefined 
      || adapterDiscountToApply !== undefined && modelDiscountToApply === undefined){
      // discount didn't exist anywhere
      // no action if model has no discount we are looking for
      return
    }

    if(adapterDiscountToApply === undefined && modelDiscountToApply !== undefined){
      // add in this.d configuredDiscount if has discount in model but not in this.d
      await this.addDiscountHandler(new configuredDiscount(modelDiscountToApply))
      // await modelDiscountToApply.action()
    }

    if(adapterDiscountToApply !== undefined && modelDiscountToApply !== undefined){
      // apply action
      // await adapterDiscountToApply.action();
      return
    }
  }

  // TODO: implement display group and dish discount method

  // rewrite orderDish
  public static clear(): void {
    // await Discounts.clear()
    this.discounts = {};
  }

  // for configured discounts 

  public static async addDiscountHandler(discountToAdd: AbstractDiscountHandler): Promise<void> {
    // isDeleted = false
    await Discount.createOrUpdate(discountToAdd);
    // await Discount.setAlive([...id])

    this.discounts[discountToAdd.id] = discountToAdd;
  }

  private static async getDiscountHandlerById(id: string): Promise<AbstractDiscountHandler | undefined> {
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

  static getInstance(initParams?: { [key: string]: string | number | boolean }): DiscountAdapter {
    return DiscountAdapter.prototype;
  }
}
