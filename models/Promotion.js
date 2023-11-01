"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const hashCode_1 = __importDefault(require("../libs/hashCode"));
const adapters_1 = require("../adapters");
const stringsInArray_1 = require("../libs/stringsInArray");
// import Decimal from "decimal.js";
// sails.on("lifted", function () {
//   setInterval(async function () {
//     checkMaintenance();
//   }, CHECK_INTERVAL);
// });
let promotionRAM = [];
sails.on("lifted", async () => {
    let promotions = await Promotion.find({ enable: true });
    for (let i = 0; i < promotions.length; i++) {
        adapters_1.Adapter.getPromotionAdapter().recreatePromotionHandler(promotions[i]);
    }
});
let attributes = {
    id: {
        type: "string",
        unique: true,
    },
    externalId: {
        type: "string",
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
    /** User can disable this discount*/
    enable: {
        type: "boolean",
        required: true,
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
    beforeCreate(init, cb) {
        cb();
    },
    async createOrUpdate(values) {
        let hash = (0, hashCode_1.default)(JSON.stringify(values));
        const promotion = await Promotion.findOne({ id: values.id });
        if (!promotion)
            return Promotion.create({ hash, ...values }).fetch();
        if (hash === promotion.hash)
            return promotion;
        return (await Promotion.update({ id: values.id }, { hash, ...values }).fetch())[0];
    },
    getAllByConcept(concept) {
        const promotionAdapter = adapters_1.Adapter.getPromotionAdapter();
        if (!concept)
            throw "concept is required";
        let activePromotionIds = promotionAdapter.getActivePromotionsIds();
        if (concept[0] === "") {
            // console.log("")
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
