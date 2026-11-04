import { WorkTime } from "@webresto/worktime";
import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";
import { OptionalAll, RequiredField } from "../interfaces/toolsTS";
import hashCode from "../lib/hashCode";
import { Adapter } from "../adapters";
import { IconfigDiscount } from "../interfaces/ConfigDiscount";
import { someInArray } from "../lib/stringsInArray";
// todo: fix types model instance to {%ModelName%}Record for PromotionCode";
import { v4 as uuid } from "uuid";
import { PromotionCodeRecord } from "./PromotionCode";

// import Decimal from "decimal.js";
// sails.on("lifted", function () {
//   setInterval(async function () {
//     checkMaintenance();
//   }, CHECK_INTERVAL);
// });

let promotionRAM: PromotionRecord[] = []

/**
 * The promotions that apply by themselves: switched on, and not marked "only by promo code" (C22).
 *
 * `onlyByCode` is read as `!= true` and not as `false`: the column is added by a migration and a record written
 * before it has no value, which is "applies by itself" - the behaviour it had.
 */
async function automaticPromotions(): Promise<PromotionRecord[]> {
  return Promotion.find({ enable: true, onlyByCode: { "!=": true }, isDeleted: false } as any);
}

sails.on("lifted", async ()=>{
  // Switched off ones too: the adapter keeps a handler for every configured promotion, and whether it applies is
  // asked of the handler later (`codePromotions`, `getAllByConcept`).
  let promotions = await Promotion.find({ createdByUser: true, isDeleted: false })

  for(let i=0; i<promotions.length; i++){
    Adapter.getPromotionAdapter().recreateConfiguredPromotionHandler(promotions[i]);
  }

  promotionRAM = await automaticPromotions()
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

  /**
   * "Works": whether the promotion applies at all. Switched off, it applies nowhere - neither by itself nor through
   * a promo code (C22, `marketing.plan.md`). On creation - `PROMOTION_ENABLE_BY_DEFAULT`.
   *
   * It used to mean "applies by itself", and a code applied a switched-off promotion all the same. That is what
   * `onlyByCode` means now; the migration of C22 moved the records that relied on the old meaning.
   */
  enable: {
    type: "boolean"
  } as unknown as boolean,

  /**
   * "Only by promo code": the promotion applies through its codes and never by itself, and the storefront does not
   * show it on a dish or a group (it is out of `promotionRAM`, which is what `getAllByConcept` answers from).
   */
  onlyByCode: {
    type: "boolean",
    defaultsTo: false,
  } as unknown as boolean,

  promotionCode: {
    collection: "promotioncode",
    via: "promotion"
  } as unknown as PromotionCodeRecord[] | string[],

  /** No active class in Discount Adapter */
  isDeleted: "boolean" as unknown as boolean,

  /** Hash object discounts */
  hash: {
    type: "string",
    required: true,
  } as unknown as string,

  worktime: "json" as unknown as WorkTime[],
};

type attributes = typeof attributes;

export interface PromotionRecord
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

// The prices of the menu may change: a storefront asks it again - once the adapter and promotionRAM hold the change,
// or it would get the old prices. One hook per name: a second one in this object replaces the first.
let Model = {
   async afterUpdate(record: PromotionRecord, cb:  (err?: string) => void) {
    if (record.createdByUser) {
      // call recreation of discountHandler
      Adapter.getPromotionAdapter().recreateConfiguredPromotionHandler(record);
    }

    promotionRAM = await automaticPromotions()
    emitter.emit("core:promotion-changed", record);
    cb();
  },

  async afterCreate(record: PromotionRecord, cb:  (err?: string) => void) {
    if (record.createdByUser) {
      // call recreation of discountHandler
      Adapter.getPromotionAdapter().recreateConfiguredPromotionHandler(record);
    }

    promotionRAM = await automaticPromotions()
    emitter.emit("core:promotion-changed", record);
    cb();
  },

  async afterDestroy(record: PromotionRecord, cb:  (err?: string) => void) {
    // delete promotion in adapter
    Adapter.getPromotionAdapter().deletePromotion(record.id)
    promotionRAM = await automaticPromotions()
    emitter.emit("core:promotion-changed", record);

    cb();
  },


  beforeUpdate(init: PromotionRecord, cb:  (err?: string) => void) {
    cb();
  },

  async beforeCreate(init: PromotionRecord, cb:  (err?: string) => void) {
    if (!init.id) {
      init.id = uuid();
    }

    const PROMOTION_ENABLE_BY_DEFAULT = await Settings.get("PROMOTION_ENABLE_BY_DEFAULT");

    // On creation, all promocodes are disabled.
    init.enable = (PROMOTION_ENABLE_BY_DEFAULT !== undefined) ? Boolean(PROMOTION_ENABLE_BY_DEFAULT) : process.env.NODE_ENV !== "production";
    cb();
  },

  async createOrUpdate(values: PromotionRecord): Promise<PromotionRecord> {
    let sortOrder = values.sortOrder
    let isDeleted = values.isDeleted
    let enable = values.enable
    let onlyByCode = values.onlyByCode
    let worktime = values.worktime
    // Deleting user space variables
    try {
      delete(values.sortOrder);
      delete(values.isDeleted);
      delete(values.enable);
      delete(values.onlyByCode);
      delete(values.worktime);

      let hash = hashCode(JSON.stringify(values));

      // Only an id is looked up: `findOne({ id: undefined })` matches every row, so a promotion created without
      // one silently updated some other promotion - or threw "More than one matching record" once there were two.
      const promotion = values.id ? await Promotion.findOne({ id: values.id }) : null;
      if (!promotion) return Promotion.create({ hash, ...values, sortOrder, isDeleted, enable, onlyByCode, worktime }).fetch();

      if (hash === promotion.hash) {
        return promotion;
      } else {
        return (await Promotion.update({ id: values.id }, { hash, ...values }).fetch())[0];
      }

    } catch (error) {
      sails.log.error(error);
      throw new Error(error)
    }
  },

  /**
   * A gift dish must be `notForSale` (free gift) or `promo` (special price): the guest
   * can't add such a dish himself, so his row never merges with the gift row in addDish.
   * Returns the error message, or null when the gift config is fine.
   */
  async validateGift(configDiscount: IconfigDiscount): Promise<string | null> {
    const giftDishIds = (configDiscount?.gift?.dishes ?? []).map((giftDish) => giftDish?.dishId).filter(Boolean);
    if (!giftDishIds.length) return null;

    const dishes = await Dish.find({ id: giftDishIds });
    for (const dishId of giftDishIds) {
      const dish = dishes.find((d) => d.id === dishId);
      if (!dish) return `Gift dish [${dishId}] not found`;
      if (!dish.notForSale && !dish.promo) return `Gift dish [${dish.name}] must be notForSale or promo`;
    }
    return null;
  },

  /** The promotions that apply by themselves for these concepts: `promotionRAM`, which "only by code" is out of. */
  getAllByConcept(concept: string[]): PromotionRecord[] {
    if(typeof concept === "string") concept = [concept];
    if(!concept) concept = ["origin"];
    const promotionAdapter = Adapter.getPromotionAdapter()
    if (!concept.length) throw "concept is required";
    let activePromotionIds = promotionAdapter.getActivePromotionsIds()

    // TODO: derectory not allow empty string
    if(concept[0] === ""){
      let filteredRAM = promotionRAM.filter(promotion =>
        (promotion.concept[0] === undefined || promotion.concept[0] === "")
        && someInArray(promotion.id,activePromotionIds))
        return filteredRAM;
    }

    let filteredRAM = promotionRAM.filter(promotion =>
      someInArray(promotion.concept,concept) || (promotion.concept[0] === undefined || promotion.concept[0] === "")
      && someInArray(promotion.id,activePromotionIds))

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
  const Promotion: typeof Model & ORMModel<PromotionRecord, "concept">;
}

// function between(from: number, to: number, a: number): boolean {
//   return (!from && !to) || (!from && to >= a) || (!to && from < a) || (from < a && to >= a);
// }

// async function checkMaintenance(){
//   const maintenance = await Maintenance.getActiveMaintenance();
//   if (maintenance) {
//     emitter.emit("core:maintenance-enabled", maintenance);
//   } else {
//     emitter.emit("core:maintenance-disabled");
//   }
// }
