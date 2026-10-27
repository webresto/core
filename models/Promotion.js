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
sails.on("lifted", async () => {
    // switched off ones too: they still apply through their codes
    let promotions = await Promotion.find({ createdByUser: true, isDeleted: false });
    for (let i = 0; i < promotions.length; i++) {
        adapters_1.Adapter.getPromotionAdapter().recreateConfiguredPromotionHandler(promotions[i]);
    }
    promotionRAM = await Promotion.find({ enable: true, isDeleted: false });
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
     * Whether the promotion applies by itself, to the baskets it targets. A promo code ignores it: switched off, the
     * promotion applies only through its codes. On creation - `PROMOTION_ENABLE_BY_DEFAULT`.
     */
    enable: {
        type: "boolean"
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
        promotionRAM = await Promotion.find({ enable: true, isDeleted: false });
        emitter.emit("core:promotion-changed", record);
        cb();
    },
    async afterCreate(record, cb) {
        if (record.createdByUser) {
            // call recreation of discountHandler
            adapters_1.Adapter.getPromotionAdapter().recreateConfiguredPromotionHandler(record);
        }
        promotionRAM = await Promotion.find({ enable: true, isDeleted: false });
        emitter.emit("core:promotion-changed", record);
        cb();
    },
    async afterDestroy(record, cb) {
        // delete promotion in adapter
        adapters_1.Adapter.getPromotionAdapter().deletePromotion(record.id);
        promotionRAM = await Promotion.find({ enable: true, isDeleted: false });
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
        let worktime = values.worktime;
        // Deleting user space variables
        try {
            delete (values.sortOrder);
            delete (values.isDeleted);
            delete (values.enable);
            delete (values.worktime);
            let hash = (0, hashCode_1.default)(JSON.stringify(values));
            const promotion = await Promotion.findOne({ id: values.id });
            if (!promotion)
                return Promotion.create({ hash, ...values, sortOrder, isDeleted, enable, worktime }).fetch();
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
