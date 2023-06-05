"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hashCode_1 = require("../libs/hashCode");
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
    },
    /** TODO: implement interface
     *  discountType: 'string',
     *  discountAmount: "number",
     *
     */
    configDiscount: {
<<<<<<< HEAD
        type: "json",
        allowNull: true,
=======
        type: "json"
>>>>>>> origin/bonuses
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
    discount: {
        type: "string",
        required: true,
    },
    discountType: {
        type: "string",
        required: true,
    },
    // remove
    actions: {
        type: "string",
        required: true,
    },
    sortOrder: {
        type: "number",
        required: true,
    },
    description: {
        type: "string",
        required: true,
    },
    /** is available by API for customer*/
    isPublic: {
        type: "boolean",
        required: true,
    },
    /** first use isJoint = false discounts then true */
    isJoint: {
        type: "boolean",
        required: true,
    },
    productCategoryDiscounts: "json",
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
<<<<<<< HEAD
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
=======
>>>>>>> origin/bonuses
};
let Model = {
    async afterUpdate(record, next) {
        if (record.createdByUser) {
            // call recreate of discountHandler
        }
<<<<<<< HEAD
        // let result: Discount[] = await Discount.find({});
        // result = result.filter(record => {
        //   if (!record.worktime) return true;
        //   try {
        //       return (WorkTimeValidator.isWorkNow({worktime: record.worktime})).workNow
        //   } catch (error) {
        //       sails.log.error("Discount > helper > error: ",error)
        //   }
        // })
        // result
        //   .filter((record) => {
        //     if (!record.worktime) return false;
        //     try {
        //       return !WorkTimeValidator.isWorkNow({ worktime: record.worktime }).workNow; // WorkTime[]
        //     } catch (error) {
        //       sails.log.error("Discount > helper > error: ", error);
        //     }
        //   })
        //   .forEach(async (record) => {
        //     // each Discount where workTime end => delete
        //     await Discount.update({ id: record.id }, { isDeleted: true }).fetch();
        //   });
=======
>>>>>>> origin/bonuses
        next();
    },
    async afterCreate(record, next) {
        if (record.createdByUser) {
            // call recreate of discountHandler
        }
        next();
    },
    async beforeUpdate(init, next) {
        next();
    },
    async beforeCreate(init, next) {
        next();
    },
    async createOrUpdate(values) {
        let hash = (0, hashCode_1.default)(JSON.stringify(values));
        const discount = await Discount.findOne({ id: values.id });
        if (!discount)
            return Discount.create({ hash, ...values }).fetch();
        if (hash === discount.hash)
            return discount;
        // return (await Discount.update({ id: values.id }, { hash, ...values }).fetch())[0];
    },
    async getAllByConcept(concept) {
        if (!concept)
            throw "concept is required";
        const discount = await Discount.find({ concept: concept });
        if (!discount)
            throw "Discount with concept: " + concept + " not found";
        return discount;
    },
    async setDelete() {
        const discounts = await Discount.find({});
        for (let discount of discounts) {
            await Discount.update({ id: discount.id }, { isDeleted: true }).fetch();
        }
    },
    async setAlive(idArray) {
        //
    },
    // async getHandler(id: string): Promise<any> {
    //   const adapter = Adapter.getDiscountAdapter()
    //   return adapter.getHandlerById(id)
    // },
<<<<<<< HEAD
=======
    getActiveDiscount: async function () {
        // TODO: here need add worktime support
        let discounts = await Discount.find({ enable: true });
        discounts = discounts.filter((discounts) => {
            let start, stop;
            // When dates interval not set is active discount
            if (!discounts.startDate && !discounts.stopDate)
                return true;
            // When start or stop date not set, is infinity
            if (!discounts.startDate)
                discounts.startDate = "0000";
            if (!discounts.stopDate)
                discounts.stopDate = "9999";
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
>>>>>>> origin/bonuses
};
module.exports = {
    primaryKey: "id",
    attributes: attributes,
    ...Model,
};
