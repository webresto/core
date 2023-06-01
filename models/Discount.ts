import { WorkTime } from "@webresto/worktime";
import ORM from "../interfaces/ORM";
import ORMModel from "../interfaces/ORMModel";
import { OptionalAll, RequiredField } from "../interfaces/toolsTS";
import hashCode from "../libs/hashCode";
import Order from "./Order";
import AbstractDiscount from "../adapters/discount/AbstractDiscount";
import { DiscountAdapter } from "../adapters/discount/default/defaultDiscountAdapter";
import { Adapter } from "../adapters";

const CHECK_INTERVAL = 60000;

sails.on("lifted", function () {
  setInterval(async function () {
    checkDiscount();
  }, CHECK_INTERVAL);
});

let attributes = {
  /** TODO: show discounts to dish and orders */
  /** TODO: isJoint global variable for all discounts*/

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

  worktime: "json" as unknown as WorkTime,
};

type attributes = typeof attributes;
interface Discount
  extends RequiredField<
      OptionalAll<attributes>,
      "id" | "configuredDiscount" | "isJoint" | "name" | "isPublic" | "description" | "concept" | "discount" | "discountType" | "actions" 
    >,
    ORM {}

export default Discount;

let Model = {
  async afterUpdate(record: Discount, next: Function){
    if(record.createdByUser){
      // call recreate of discountHandler
    }
    next()
  },

  async afterCreate(record: Discount, next: Function){
    if(record.createdByUser){
      // call recreate of discountHandler
    }
    next()
  },

  async beforeUpdate(init: Discount, next: Function){
    next()
  },

  async beforeCreate(init: Discount, next: Function){
    next()
  },

  async createOrUpdate(values: AbstractDiscount): Promise<AbstractDiscount> {
    let hash = hashCode(JSON.stringify(values));

    const discount = await Discount.findOne({ id: values.id });

    if (!discount) return Discount.create({ hash, ...values }).fetch();

    if (hash === discount.hash) return discount;

    return (await Discount.update({ id: values.id }, { hash, ...values }).fetch())[0];
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

  getActiveDiscount: async function () {
    // TODO: here need add worktime support
    let discounts = await Discount.find({ enable: true });

    discounts = discounts.filter((discounts) => {
      let start: number, stop: number;
      // When dates interval not set is active discount
      if (!discounts.startDate && !discounts.stopDate) return true;

      // When start or stop date not set, is infinity
      if (!discounts.startDate) discounts.startDate = "0000";
      if (!discounts.stopDate) discounts.stopDate = "9999";

      if (discounts.startDate) {
        start = new Date(discounts.startDate).getTime();
      }

      if (discounts.stopDate) {
        stop = new Date(discounts.stopDate).getTime();
      }
      const now = new Date().getTime();
      return between(start, stop, now);
    });

    // return array of active discounts
    return discounts[0];
  },
};

module.exports = {
  primaryKey: "id",
  attributes: attributes,
  ...Model,
};

declare global {
  const Discount: typeof Model & ORMModel<Discount, "configuredDiscount">;
}

async function checkDiscount() {
  const discount = await Discount.getActiveDiscount();
  if (discount) {
    emitter.emit("core-discount-enabled", discount);
  } else {
    emitter.emit("core-discount-disabled");
  }
}

function between(from: number, to: number, a: number): boolean {
  return (!from && !to) || (!from && to >= a) || (!to && from < a) || (from < a && to >= a);
}
