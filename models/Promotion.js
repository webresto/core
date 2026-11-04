"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const hashCode_1 = __importDefault(require("../lib/hashCode"));
const adapters_1 = require("../adapters");
const stringsInArray_1 = require("../lib/stringsInArray");
// todo: fix types model instance to {%ModelName%}Record for PromotionCode";
const uuid_1 = require("uuid");
// import Decimal from "decimal.js";
// sails.on("lifted", function () {
//   setInterval(async function () {
//     checkMaintenance();
//   }, CHECK_INTERVAL);
// });
let promotionRAM = [];
/**
 * The promotions that apply by themselves: switched on, and not marked "only by promo code" (C22).
 *
 * `onlyByCode` is read as `!= true` and not as `false`: the column is added by a migration and a record written
 * before it has no value, which is "applies by itself" - the behaviour it had.
 */
async function automaticPromotions() {
    return Promotion.find({ enable: true, onlyByCode: { "!=": true }, isDeleted: false });
}
sails.on("lifted", async () => {
    // Switched off ones too: the adapter keeps a handler for every configured promotion, and whether it applies is
    // asked of the handler later (`codePromotions`, `getAllByConcept`).
    let promotions = await Promotion.find({ createdByUser: true, isDeleted: false });
    for (let i = 0; i < promotions.length; i++) {
        adapters_1.Adapter.getPromotionAdapter().recreateConfiguredPromotionHandler(promotions[i]);
    }
    promotionRAM = await automaticPromotions();
});
let attributes = {
    id: {
        type: "string",
        unique: true,
    },
    externalId: {
        type: "string",
        allowNull: false,
        unique: true,
    },
    configDiscount: {
        type: "json",
    },
    /** created by User */
    createdByUser: {
        type: "boolean",
        required: true,
    },
    name: {
        type: "string",
        required: true,
    },
    badge: {
        type: "string",
        required: true,
    },
    concept: {
        type: "json",
        required: true,
    },
    sortOrder: {
        type: "number",
    },
    // teaser: {
    //   type: "string",
    //   required: true,
    // } as unknown as string,
    description: {
        type: "string",
        required: true,
    },
    /** is available by API for customer only for display */
    isPublic: {
        type: "boolean",
        required: true,
    },
    /** first use isJoint = false discounts then true */
    isJoint: {
        type: "boolean",
        required: true,
    },
    productCategoryPromotions: "json",
    /**
     * "Works": whether the promotion applies at all. Switched off, it applies nowhere - neither by itself nor through
     * a promo code (C22, `marketing.plan.md`). On creation - `PROMOTION_ENABLE_BY_DEFAULT`.
     *
     * It used to mean "applies by itself", and a code applied a switched-off promotion all the same. That is what
     * `onlyByCode` means now; the migration of C22 moved the records that relied on the old meaning.
     */
    enable: {
        type: "boolean"
    },
    /**
     * "Only by promo code": the promotion applies through its codes and never by itself, and the storefront does not
     * show it on a dish or a group (it is out of `promotionRAM`, which is what `getAllByConcept` answers from).
     */
    onlyByCode: {
        type: "boolean",
        defaultsTo: false,
    },
    promotionCode: {
        collection: "promotioncode",
        via: "promotion"
    },
    /** No active class in Discount Adapter */
    isDeleted: "boolean",
    /** Hash object discounts */
    hash: {
        type: "string",
        required: true,
    },
    worktime: "json",
};
// The prices of the menu may change: a storefront asks it again - once the adapter and promotionRAM hold the change,
// or it would get the old prices. One hook per name: a second one in this object replaces the first.
let Model = {
    async afterUpdate(record, cb) {
        if (record.createdByUser) {
            // call recreation of discountHandler
            adapters_1.Adapter.getPromotionAdapter().recreateConfiguredPromotionHandler(record);
        }
        promotionRAM = await automaticPromotions();
        emitter.emit("core:promotion-changed", record);
        cb();
    },
    async afterCreate(record, cb) {
        if (record.createdByUser) {
            // call recreation of discountHandler
            adapters_1.Adapter.getPromotionAdapter().recreateConfiguredPromotionHandler(record);
        }
        promotionRAM = await automaticPromotions();
        emitter.emit("core:promotion-changed", record);
        cb();
    },
    async afterDestroy(record, cb) {
        // delete promotion in adapter
        adapters_1.Adapter.getPromotionAdapter().deletePromotion(record.id);
        promotionRAM = await automaticPromotions();
        emitter.emit("core:promotion-changed", record);
        cb();
    },
    beforeUpdate(init, cb) {
        cb();
    },
    async beforeCreate(init, cb) {
        if (!init.id) {
            init.id = (0, uuid_1.v4)();
        }
        const PROMOTION_ENABLE_BY_DEFAULT = await Settings.get("PROMOTION_ENABLE_BY_DEFAULT");
        // On creation, all promocodes are disabled.
        init.enable = (PROMOTION_ENABLE_BY_DEFAULT !== undefined) ? Boolean(PROMOTION_ENABLE_BY_DEFAULT) : process.env.NODE_ENV !== "production";
        cb();
    },
    async createOrUpdate(values) {
        let sortOrder = values.sortOrder;
        let isDeleted = values.isDeleted;
        let enable = values.enable;
        let onlyByCode = values.onlyByCode;
        let worktime = values.worktime;
        // Deleting user space variables
        try {
            delete (values.sortOrder);
            delete (values.isDeleted);
            delete (values.enable);
            delete (values.onlyByCode);
            delete (values.worktime);
            let hash = (0, hashCode_1.default)(JSON.stringify(values));
            // Only an id is looked up: `findOne({ id: undefined })` matches every row, so a promotion created without
            // one silently updated some other promotion - or threw "More than one matching record" once there were two.
            const promotion = values.id ? await Promotion.findOne({ id: values.id }) : null;
            if (!promotion)
                return Promotion.create({ hash, ...values, sortOrder, isDeleted, enable, onlyByCode, worktime }).fetch();
            if (hash === promotion.hash) {
                return promotion;
            }
            else {
                return (await Promotion.update({ id: values.id }, { hash, ...values }).fetch())[0];
            }
        }
        catch (error) {
            sails.log.error(error);
            throw new Error(error);
        }
    },
    /**
     * A gift dish must be `notForSale` (free gift) or `promo` (special price): the guest
     * can't add such a dish himself, so his row never merges with the gift row in addDish.
     * Returns the error message, or null when the gift config is fine.
     */
    async validateGift(configDiscount) {
        const giftDishIds = (configDiscount?.gift?.dishes ?? []).map((giftDish) => giftDish?.dishId).filter(Boolean);
        if (!giftDishIds.length)
            return null;
        const dishes = await Dish.find({ id: giftDishIds });
        for (const dishId of giftDishIds) {
            const dish = dishes.find((d) => d.id === dishId);
            if (!dish)
                return `Gift dish [${dishId}] not found`;
            if (!dish.notForSale && !dish.promo)
                return `Gift dish [${dish.name}] must be notForSale or promo`;
        }
        return null;
    },
    /** The promotions that apply by themselves for these concepts: `promotionRAM`, which "only by code" is out of. */
    getAllByConcept(concept) {
        if (typeof concept === "string")
            concept = [concept];
        if (!concept)
            concept = ["origin"];
        const promotionAdapter = adapters_1.Adapter.getPromotionAdapter();
        if (!concept.length)
            throw "concept is required";
        let activePromotionIds = promotionAdapter.getActivePromotionsIds();
        // TODO: derectory not allow empty string
        if (concept[0] === "") {
            let filteredRAM = promotionRAM.filter(promotion => (promotion.concept[0] === undefined || promotion.concept[0] === "")
                && (0, stringsInArray_1.someInArray)(promotion.id, activePromotionIds));
            return filteredRAM;
        }
        let filteredRAM = promotionRAM.filter(promotion => (0, stringsInArray_1.someInArray)(promotion.concept, concept) || (promotion.concept[0] === undefined || promotion.concept[0] === "")
            && (0, stringsInArray_1.someInArray)(promotion.id, activePromotionIds));
        if (!filteredRAM)
            throw "Promotion with concept: " + concept + " not found";
        return filteredRAM;
    },
};
module.exports = {
    primaryKey: "id",
    attributes: attributes,
    ...Model,
};
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
