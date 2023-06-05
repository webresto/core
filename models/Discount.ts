import { WorkTime } from "@webresto/worktime";
import ORM from "../interfaces/ORM";
import ORMModel from "../interfaces/ORMModel";
import { OptionalAll, RequiredField } from "../interfaces/toolsTS";
import hashCode from "../libs/hashCode";
import Order from "./Order";
import AbstractDiscount from "../adapters/discount/AbstractDiscount";
// import { DiscountAdapter } from "../adapters/discount/default/defaultDiscountAdapter";
import { Adapter } from "../adapters";
import { WorkTimeValidator } from "@webresto/worktime";
// import Decimal from "decimal.js";

let attributes = {
  /** TODO: show discounts to dish and orders */
  /** TODO: isJoint global variable for all discounts*/
  /** TODO: worktime rework */

  /** */
  id: {
    type: "string",
    required: true,
    autoIncrement: true,
    unique: true,
  } as unknown as string,

  /** TODO: implement interface
   *  discountType: 'string',
   *  discountAmount: "number",
   *
   */
  configDiscount: {
    type: "json"
  } as unknown as any,

  /** created by User */
  createdByUser: {
    type: "boolean",
    required: true,
  } as unknown as boolean,

  name: {
    type: "string",
    required: true,
  } as unknown as string,

  concept: {
    type: "json",
    required: true,
  } as unknown as string[],

  discount: {
    type: "string",
    required: true,
  } as unknown as string,

  discountType: {
    type: "string",
    required: true,
  } as unknown as string,

  // remove
  actions: {
    type: "string",
    required: true,
  } as unknown as string,

  sortOrder: {
    type: "number",
    required: true,
  } as unknown as number,

  description: {
    type: "string",
    required: true,
  } as unknown as string,

  /** is available by API for customer*/
  isPublic: {
    type: "boolean",
    required: true,
  } as unknown as boolean,

  /** first use isJoint = false discounts then true */
  isJoint: {
    type: "boolean",
    required: true,
  } as unknown as boolean,

  productCategoryDiscounts: "json" as unknown as any,

  /** User can disable this discount*/
  enable: {
    type: "boolean",
    required: true,
  } as unknown as boolean,

  /** No active class in Discount Adapter */
  isDeleted: "boolean" as unknown as boolean,

  /** Хеш обекта скидки */
  hash: {
    type: "string",
    required: true,
  } as unknown as string,

  worktime: "json" as unknown as WorkTime[],

  // condition: {
  //   type: (order: Order) => Promise<boolean>,
  //   required: true,
  // } as unknown as (order: Order) => Promise<boolean>,

  // action: {
  //   type: () => Promise<void>,
  //   required: true,
  // } as unknown as () => Promise<void>,

  // displayGroupDiscount: {
  //   type: () => Promise<void>,
  //   required: true,
  // } as unknown as () => Promise<void>,

  // displayGroupDish: {
  //   type: () => Promise<void>,
  //   required: true,
  // } as unknown as () => Promise<void>,
};

type attributes = typeof attributes;
interface Discount
  extends RequiredField<
      OptionalAll<attributes>,
      | "id"
      | "configDiscount"
      | "isJoint"
      | "name"
      | "isPublic"
      | "description"
      | "concept"
      | "discount"
      | "discountType"
      | "actions"
      // | "condition"
      // | "action"
      // | "displayGroupDish"
      // | "displayGroupDiscount"
      | "enable"
      | "isDeleted"
      | "sortOrder"
      | "productCategoryDiscounts"
      | "hash"
    >,
    ORM {}

export default Discount;

let Model = {
  async afterUpdate(record: Discount, next: Function) {
    if (record.createdByUser) {
      // call recreate of discountHandler
    }

    let result: Discount[] = await Discount.find({});

    // result = result.filter(record => {
    //   if (!record.worktime) return true;
    //   try {
    //       return (WorkTimeValidator.isWorkNow({worktime: record.worktime})).workNow
    //   } catch (error) {
    //       sails.log.error("Discount > helper > error: ",error)
    //   }
    // })

    result
      .filter((record) => {
        if (!record.worktime) return true;
        try {
          return WorkTimeValidator.isWorkNow({ worktime: record.worktime }).workNow; 
        } catch (error) {
          sails.log.error("Discount > helper > error: ", error);
        }
      })


    next();
  },

  async afterCreate(record: Discount, next: Function) {
    if (record.createdByUser) {
      // call recreate of discountHandler
    }

    next();
  },

  async beforeUpdate(init: Discount, next: Function) {
    next();
  },

  async beforeCreate(init: Discount, next: Function) {
    next();
  },

  async createOrUpdate(values: AbstractDiscount): Promise<AbstractDiscount> {
    let hash = hashCode(JSON.stringify(values));

    const discount = await Discount.findOne({ id: values.id });

    if (!discount) return Discount.create({ hash, ...values }).fetch();

    if (hash === discount.hash) return discount;

    // return (await Discount.update({ id: values.id }, { hash, ...values }).fetch())[0];
  },

  async getAllByConcept(concept: string[]): Promise<Discount[]> {
    if (!concept) throw "concept is required";

    const discount: Discount[] = await Discount.find({ concept: concept });

    if (!discount) throw "Discount with concept: " + concept + " not found";

    return discount;
  },

  async setDelete(): Promise<void> {
    const discounts = await Discount.find({});
    for (let discount of discounts) {
      await Discount.update({ id: discount.id }, { isDeleted: true }).fetch();
    }
  },

  async setAlive(idArray: string[]): Promise<void> {
    //
  },

  // async getHandler(id: string): Promise<any> {
  //   const adapter = Adapter.getDiscountAdapter()
  //   return adapter.getHandlerById(id)
  // },
};

module.exports = {
  primaryKey: "id",
  attributes: attributes,
  ...Model,
};

declare global {
  const Discount: typeof Model & ORMModel<Discount, "configDiscount">;
}
