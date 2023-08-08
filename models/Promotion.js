"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hashCode_1 = require("../libs/hashCode");
const adapters_1 = require("../adapters");
const promotionAdapter_1 = require("./../adapters/promotion/default/promotionAdapter");
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
    async afterUpdate(record, next) {
        if (record.createdByUser) {
            // call recreate of discountHandler
            promotionAdapter_1.PromotionAdapter.recreatePromotionHandler(record);
        }
        next();
    },
    async afterCreate(record, next) {
        if (record.createdByUser) {
            // call recreate of discountHandler
            promotionAdapter_1.PromotionAdapter.recreatePromotionHandler(record);
        }
        next();
    },
    async beforeUpdate(init, next) {
        next();
    },
    async beforeCreate(init, next) {
        // init.setORMId("a")
        next();
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
    async getAllByConcept(concept) {
        // TODO: get all active by concept
        const promotionAdapter = await adapters_1.Adapter.getPromotionAdapter();
        // discountAdapter.getAllConcept(concept)
        // discountAdapter.processOrder()
        if (!concept)
            throw "concept is required";
        let activePromotionIds = promotionAdapter.getActivePromotionsIds();
        const promotion = await Promotion.find({
            where: {
                // @ts-ignore TODO: First fix types
                and: [
                    { id: { in: activePromotionIds } },
                    { enable: true },
                    { concept: concept }
                ]
            },
            sort: "sortOrder ASC"
        });
        if (!promotion)
            throw "Promotion with concept: " + concept + " not found";
        let filtredPromotion = promotion.filter((promotion) => {
            return promotion.enable === true && promotion.isDeleted === false;
        });
        return filtredPromotion;
    },
    async setAlive(idArray) {
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
