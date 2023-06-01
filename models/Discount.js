"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const hashCode_1 = require("../libs/hashCode");
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
    },
    /** TODO: implement interface
     *  discountType: 'string',
     *  discountAmount: "number",
     *
     */
    configuredDiscount: "json",
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
    /** created by User */
    isConfigured: {
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
    startDate: "string",
    stopDate: "string",
    condition: {
        type: (order) => Promise,
        required: true,
    },
    action: {
        type: () => Promise,
        required: true,
    },
};
let Model = {
    async getAll() {
        const discounts = await Discount.find({});
        if (!discounts)
            throw `There is no discount`;
        return discounts;
    },
    async getAllByConcept(concept) {
        if (!concept[0])
            throw "concept is required";
        const discount = await Discount.find({ concept: concept });
        if (!discount)
            throw "Discount with concept: " + concept + " not found";
        return discount;
    },
    async getById(discountId) {
        if (!discountId)
            throw "discountId is required";
        const discount = await Discount.findOne({ id: discountId });
        if (!discount)
            throw "Discount with discountId: " + discountId + " not found";
        return discount;
    },
    async deleteById(discountId) {
        let discount = await Discount.findOne({ id: discountId });
        if (!discount)
            throw `There is no discount`;
        await Discount.update({ id: discountId }, { isDeleted: true }).fetch();
    },
    async switchEnableById(discountId) {
        let discount = await Discount.findOne({ id: discountId });
        if (!discount)
            throw `There is no discount`;
        await Discount.update({ id: discountId }, { enable: !discount.enable }).fetch();
    },
    async createOrUpdate(values) {
        let hash = (0, hashCode_1.default)(JSON.stringify(values));
        const discount = await Discount.findOne({ id: values.id });
        if (!discount)
            return Discount.create({ hash, ...values }).fetch();
        if (hash === discount.hash)
            return discount;
        return (await Discount.update({ id: values.id }, { hash, ...values }).fetch())[0];
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
};
module.exports = {
    primaryKey: "id",
    attributes: attributes,
    ...Model,
};
async function checkDiscount() {
    const discount = await Discount.getActiveDiscount();
    if (discount) {
        emitter.emit("core-discount-enabled", discount);
    }
    else {
        emitter.emit("core-discount-disabled");
    }
}
function between(from, to, a) {
    return (!from && !to) || (!from && to >= a) || (!to && from < a) || (from < a && to >= a);
}
