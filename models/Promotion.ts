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
import { stringsInArray } from "../libs/stringsInArray";
import PromotionCode from "../models/PromotionCode";

// import Decimal from "decimal.js";
// sails.on("lifted", function () {
//   setInterval(async function () {
//     checkMaintenance();
//   }, CHECK_INTERVAL);
// });

let promotionRAM = []

sails.on("lifted", async ()=>{
  let promotions = await Promotion.find({ enable:true })
  
  for(let i=0; i<promotions.length; i++){
    Adapter.getPromotionAdapter().recreatePromotionHandler(promotions[i]);
  }
})

let attributes = {
  id: {
    type: "string",
    unique: true,
  } as unknown as string,

  externalId: {
    type: "string",
    allowNull: false,
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

  badge: {
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

  // teaser: {
  //   type: "string",
  //   required: true,
  // } as unknown as string,

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
    type: "boolean"
  } as unknown as boolean,

  promotionCode: {
    collection: "promotioncode",
    via: "promotion",
  } as unknown as PromotionCode[],

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
      | "badge"
      | "isDeleted"
      | "createdByUser"
      | "externalId"
    >,
    ORM {}

export default Promotion;

let Model = {
   async afterUpdate(record: Promotion, cb:  (err?: string) => void) {
    if (record.createdByUser) {
      // call recreate of discountHandler
      Adapter.getPromotionAdapter().recreateConfiguredPromotionHandler(record);
    }

    promotionRAM = await Promotion.find({enable: true, isDeleted: false})
    cb();
  },

  async afterCreate(record: Promotion, cb:  (err?: string) => void) {
    if (record.createdByUser) {
      // call recreate of discountHandler
      Adapter.getPromotionAdapter().recreateConfiguredPromotionHandler(record);
    }

    promotionRAM = await Promotion.find({enable: true, isDeleted: false})
    cb();
  },

  async afterDestroy(record: Promotion, cb:  (err?: string) => void) {
    // delete promotion in adapter
    Adapter.getPromotionAdapter().deletePromotion(record.id)
    promotionRAM = await Promotion.find({enable: true, isDeleted: false})

    cb();
  },


  beforeUpdate(init: Promotion, cb:  (err?: string) => void) {
    cb();
  },

  async beforeCreate(init: Promotion, cb:  (err?: string) => void) {
    const PROMOTION_ENABLE_BY_DEFAULT = await Settings.get("PROMOTION_ENABLE_BY_DEFAULT")
    init.enable = (PROMOTION_ENABLE_BY_DEFAULT !== undefined) ? Boolean(PROMOTION_ENABLE_BY_DEFAULT) : true;
    cb();
  },

  async createOrUpdate(values: Promotion): Promise<Promotion> {
    let sortOrder = values.sortOrder
    let isDeleted = values.isDeleted
    let enable = values.enable
    let worktime = values.worktime
    // Deleting user space variables
    try {
      delete(values.sortOrder);
      delete(values.isDeleted);
      delete(values.enable);
      delete(values.worktime);

      let hash = hashCode(JSON.stringify(values));
    
      const promotion = await Promotion.findOne({ id: values.id });
      if (!promotion) return Promotion.create({ hash, ...values, sortOrder, isDeleted, enable, worktime }).fetch();

      if (hash === promotion.hash) {
        return promotion;
      } else {
        return (await Promotion.update({ id: values.id }, { hash, ...values }).fetch())[0];
      }

    } catch (error) {
      console.log(error);
    }
  },

  getAllByConcept(concept: string[]): Promotion[] {

    if (concept.length < 1) {
      sails.warn(`Promotion > getAllByConcept : [concept] array is unstable feature`, concept)
    }
    
    const promotionAdapter = Adapter.getPromotionAdapter()
    if (!concept) throw "concept is required";
    let activePromotionIds = promotionAdapter.getActivePromotionsIds()

    if(concept[0] === ""){
      let filteredRAM = promotionRAM.filter(promotion => 
        (promotion.concept[0] === undefined || promotion.concept[0] === "")
        && stringsInArray(promotion.id,activePromotionIds))
        return filteredRAM;
    }

    let filteredRAM = promotionRAM.filter(promotion => 
      stringsInArray(promotion.concept,concept) || (promotion.concept[0] === undefined || promotion.concept[0] === "")
      && stringsInArray(promotion.id,activePromotionIds))

    if (!filteredRAM) throw "Promotion with concept: " + concept + " not found";

    return filteredRAM;
  },

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
