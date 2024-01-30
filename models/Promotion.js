"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const hashCode_1 = __importDefault(require("../libs/hashCode"));
const adapters_1 = require("../adapters");
const stringsInArray_1 = require("../libs/stringsInArray");
const uuid_1 = require("uuid");
// import Decimal from "decimal.js";
// sails.on("lifted", function () {
//   setInterval(async function () {
//     checkMaintenance();
//   }, CHECK_INTERVAL);
// });
let promotionRAM = [];
sails.on("lifted", async () => {
    let promotions = await Promotion.find({ enable: true, createdByUser: true });
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
     * User can disable this discount
     * By default is disabled
     * promocode ignore this field, and apply promotion by code
    */
    enable: {
        type: "boolean"
    },
    promotionCode: {
        collection: "promotioncode",
        via: "promotion",
    },
    /** No active class in Discount Adapter */
    isDeleted: "boolean",
    /** Хеш обекта скидки */
    hash: {
        type: "string",
        required: true,
    },
    worktime: "json",
};
let Model = {
    async afterUpdate(record, cb) {
        if (record.createdByUser) {
            // call recreate of discountHandler
            adapters_1.Adapter.getPromotionAdapter().recreateConfiguredPromotionHandler(record);
        }
        promotionRAM = await Promotion.find({ enable: true, isDeleted: false });
        cb();
    },
    async afterCreate(record, cb) {
        if (record.createdByUser) {
            // call recreate of discountHandler
            adapters_1.Adapter.getPromotionAdapter().recreateConfiguredPromotionHandler(record);
        }
        promotionRAM = await Promotion.find({ enable: true, isDeleted: false });
        cb();
    },
    async afterDestroy(record, cb) {
        // delete promotion in adapter
        adapters_1.Adapter.getPromotionAdapter().deletePromotion(record.id);
        promotionRAM = await Promotion.find({ enable: true, isDeleted: false });
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
        // On create, all promocodes are disabled.
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
            console.log(error);
        }
    },
    getAllByConcept(concept) {
        if (concept.length < 1) {
            sails.warn(`Promotion > getAllByConcept : [concept] array is unstable feature`, concept);
        }
        const promotionAdapter = adapters_1.Adapter.getPromotionAdapter();
        if (!concept)
            throw "concept is required";
        let activePromotionIds = promotionAdapter.getActivePromotionsIds();
        if (concept[0] === "") {
            let filteredRAM = promotionRAM.filter(promotion => (promotion.concept[0] === undefined || promotion.concept[0] === "")
                && (0, stringsInArray_1.stringsInArray)(promotion.id, activePromotionIds));
            return filteredRAM;
        }
        let filteredRAM = promotionRAM.filter(promotion => (0, stringsInArray_1.stringsInArray)(promotion.concept, concept) || (promotion.concept[0] === undefined || promotion.concept[0] === "")
            && (0, stringsInArray_1.stringsInArray)(promotion.id, activePromotionIds));
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
//     emitter.emit("core-maintenance-enabled", maintenance);
//   } else {
//     emitter.emit("core-maintenance-disabled");
//   }
// }
