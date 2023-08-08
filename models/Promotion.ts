import { WorkTime } from "@webresto/worktime";
import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";
import { OptionalAll, RequiredField } from "../interfaces/toolsTS";
import hashCode from "../libs/hashCode";
import Order from "./Order";
import AbstractPromotion from "../adapters/promotion/AbstractPromotion";
import { Adapter } from "../adapters";
import { IconfigDiscount } from "../interfaces/ConfigDiscount";
import { PromotionAdapter } from './../adapters/promotion/default/promotionAdapter';
import AbstractPromotionHandler from "../adapters/promotion/AbstractPromotion";


// import Decimal from "decimal.js";
// sails.on("lifted", function () {
//   setInterval(async function () {
//     checkMaintenance();
//   }, CHECK_INTERVAL);
// });

let attributes = {
  id: {
    type: "string",
    unique: true,
  } as unknown as string,

  externalId: {
    type: "string",
    unique: true,
  } as unknown as string,

  configDiscount: {
    type: "json",
  } as unknown as IconfigDiscount,

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

  sortOrder: {
    type: "number",
  } as unknown as number,

  description: {
    type: "string",
    required: true,
  } as unknown as string,

  /** is available by API for customer only for display */
  isPublic: {
    type: "boolean",
    required: true,
  } as unknown as boolean,

  /** first use isJoint = false discounts then true */
  isJoint: {
    type: "boolean",
    required: true,
  } as unknown as boolean,

  productCategoryPromotions: "json" as unknown as any,

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
};

type attributes = typeof attributes;
interface Promotion
  extends RequiredField<
      OptionalAll<attributes>,
      | "id"
      | "configDiscount"
      | "isJoint"
      | "name"
      | "isPublic"
      | "description"
      | "concept"
      | "enable"
      | "isDeleted"
      | "createdByUser"
      | "externalId"
    >,
    ORM {}

export default Promotion;

let Model = {
  async afterUpdate(record: Promotion, next: Function) {
    if (record.createdByUser) {
      // call recreate of discountHandler
      PromotionAdapter.recreatePromotionHandler(record);
    }

    next();
  },

  async afterCreate(record: Promotion, next: Function) {
    if (record.createdByUser) {
      // call recreate of discountHandler
      PromotionAdapter.recreatePromotionHandler(record);
    }

    next();
  },

  async beforeUpdate(init: Promotion, next: Function) {
    next();
  },

  async beforeCreate(init: Promotion, next: Function) {
    // init.setORMId("a")
    next();
  },

  async createOrUpdate(values: Promotion): Promise<Promotion> {
    let hash = hashCode(JSON.stringify(values));

    const promotion = await Promotion.findOne({ id: values.id });

    if (!promotion) return Promotion.create({ hash, ...values }).fetch();

    if (hash === promotion.hash) return promotion;

    return (await Promotion.update({ id: values.id }, { hash, ...values }).fetch())[0];
  },

  async getAllByConcept(concept: string[]): Promise<Promotion[]> {
    // TODO: get all active by concept
    const promotionAdapter = await Adapter.getPromotionAdapter()
    // discountAdapter.getAllConcept(concept)
    // discountAdapter.processOrder()

    
    if (!concept) throw "concept is required";
    let activePromotionIds = promotionAdapter.getActivePromotionsIds()

    const promotion: Promotion[] = await Promotion.find({
      where: {
        // @ts-ignore TODO: First fix types
          and: [
              { id: { in: activePromotionIds }},
              { enable: true },
              { concept: concept }
          ]
      },
      sort: "sortOrder ASC"
     }
   );

    if (!promotion) throw "Promotion with concept: " + concept + " not found";

    let filtredPromotion = promotion.filter((promotion) => {
      return promotion.enable === true && promotion.isDeleted === false;
    });

    return filtredPromotion;
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
  const Promotion: typeof Model & ORMModel<Promotion, "concept">;
}

// function between(from: number, to: number, a: number): boolean {
//   return (!from && !to) || (!from && to >= a) || (!to && from < a) || (from < a && to >= a);
// }

// async function checkMaintenance(){
//   const maintenance = await Maintenance.getActiveMaintenance();
//   if (maintenance) {
//     emitter.emit("core-maintenance-enabled", maintenance);
//   } else {
//     emitter.emit("core-maintenance-disabled");
//   }
// }
