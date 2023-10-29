"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const checkExpression_1 = __importDefault(require("../libs/checkExpression"));
const hashCode_1 = __importDefault(require("../libs/hashCode"));
const uuid_1 = require("uuid");
const adapters_1 = require("../adapters");
const CustomData_1 = require("../interfaces/CustomData");
const slugIt_1 = require("../libs/slugIt");
let attributes = {
    /** */
    id: {
        type: "string",
        //required: true,
    },
    /** */
    rmsId: {
        type: "string",
        //required: true,
    },
    /** */
    additionalInfo: {
        type: "string",
        allowNull: true,
    },
    /** Article */
    code: {
        type: "string",
        allowNull: true,
    },
    /** Description of the dish */
    description: {
        type: "string",
        allowNull: true,
    },
    /** Ingredients of dish */
    ingredients: {
        type: "string",
        allowNull: true,
    },
    /** Name */
    name: {
        type: "string",
        required: true,
    },
    /** SEO description */
    seoDescription: {
        type: "string",
        allowNull: true,
    },
    /** SEO keywords */
    seoKeywords: {
        type: "string",
        allowNull: true,
    },
    /** SEO text */
    seoText: {
        type: "string",
        allowNull: true,
    },
    /** SEO title */
    seoTitle: {
        type: "string",
        allowNull: true,
    },
    /** The amount of carbohydrates per (100g)*/
    carbohydrateAmount: "number",
    /** The amount of carbohydrates in the dish */
    carbohydrateFullAmount: {
        type: "number",
        allowNull: true
    },
    /** Energy value (100 g) */
    energyAmount: {
        type: "number",
        allowNull: true
    },
    /** Energy value */
    energyFullAmount: {
        type: "number",
        allowNull: true
    },
    /**  The amount of fat (100 g) */
    fatAmount: {
        type: "number",
        allowNull: true
    },
    /** The amount of fat in the dish */
    fatFullAmount: {
        type: "number",
        allowNull: true
    },
    /** The number of proteins (100g)  */
    fiberAmount: {
        type: "number",
        allowNull: true
    },
    /** The amount of proteins in the dish */
    fiberFullAmount: {
        type: "number",
        allowNull: true
    },
    /** The group identifier in which the dish is located
     * @deprecated will  be deleted in v2
    */
    groupId: {
        type: "string",
        allowNull: true,
    },
    /** Unit of measurement of goods (kg, l, pcs, port.)*/
    measureUnit: {
        type: "string",
        allowNull: true,
    },
    /** The price of the dish */
    price: "number",
    /**  */
    productCategoryId: {
        type: "string",
        allowNull: true,
    },
    /** Type */
    type: "string",
    /** Weight  */
    weight: {
        type: "number",
        allowNull: true
    },
    /** Sorting order */
    sortOrder: "number",
    /** The dish is removed */
    isDeleted: "boolean",
    /** The dish can be modified*/
    isModificable: "boolean",
    /** Модифакторы блюда */
    modifiers: {
        // collection: 'dish'
        type: "json",
    },
    /** Parental group */
    parentGroup: {
        model: "group",
    },
    /** Tags for filtering (vegetarian, sharp ...) */
    tags: {
        type: "json",
    },
    /** Balance for sale, if -1, then as much as you like */
    balance: {
        type: "number",
        defaultsTo: -1,
    },
    /**List of images of the dish*/
    images: {
        collection: "mediafile",
        via: "dish",
    },
    /** Слаг */
    slug: {
        type: "string",
        unique: true
    },
    /** The concept to which the dish belongs */
    concept: "string",
    /** Wesh */
    hash: "string",
    /** Can be seen on the site on the menu */
    visible: "boolean",
    /** A sign that this is a modifier */
    modifier: "boolean",
    /**A sign that a promotional dish */
    promo: "boolean",
    /** Working hours */
    worktime: "json",
    /*
    helper.addCustomField("Dish", "discountAmount: Float");
    helper.addCustomField("Dish", "discountType: String");
    helper.addCustomField("Dish", "oldPrice: Float");
    */
    customData: "json",
};
let Model = {
    beforeCreate: async function (init, cb) {
        emitter.emit('core:dish-before-create', init);
        if (!init.id) {
            init.id = (0, uuid_1.v4)();
        }
        if (!init.concept) {
            init.concept = "origin";
        }
        const slugOpts = [];
        if (init.concept !== "origin") {
            slugOpts.push(init.concept);
        }
        init.slug = await (0, slugIt_1.slugIt)("dish", init.name, "slug", slugOpts);
        if (!(0, CustomData_1.isCustomData)(init.customData)) {
            init.customData = {};
        }
        cb();
    },
    beforeUpdate: async function (value, cb) {
        emitter.emit('core:dish-before-update', value);
        if (value.customData) {
            if (value.id !== undefined) {
                let current = await Dish.findOne({ id: value.id });
                if (!(0, CustomData_1.isCustomData)(current.customData))
                    current.customData = {};
                let customData = { ...current.customData, ...value.customData };
                value.customData = customData;
            }
        }
        return cb();
    },
    afterUpdate: function (record, cb) {
        emitter.emit('core:dish-after-update', record);
        return cb();
    },
    afterCreate: function (record, cb) {
        emitter.emit('core:dish-after-create', record);
        return cb();
    },
    /**
     * Accepts Waterline Criteria and prepares it there isdeleted = false, balance! = 0. Thus, this function allows
     * Find in the base of the dishes according to the criterion and at the same time such that you can work with them to the user.
     * @param criteria - criteria asked
     * @return Found dishes
     */
    async getDishes(criteria = {}) {
        criteria.isDeleted = false;
        if (!(await Settings.get("ShowUnavailableDishes"))) {
            criteria.balance = { "!=": 0 };
        }
        let dishes = await Dish.find(criteria).populate("images");
        for await (let dish of dishes) {
            const reason = (0, checkExpression_1.default)(dish);
            if (!reason) {
                await Dish.getDishModifiers(dish);
                if (dish.images.length >= 2)
                    dish.images.sort((a, b) => b.uploadDate.localeCompare(a.uploadDate));
            }
            else {
                dishes.splice(dishes.indexOf(dish), 1);
            }
        }
        dishes.sort((a, b) => a.sortOrder - b.sortOrder);
        await emitter.emit("core-dish-get-dishes", dishes);
        return dishes;
    },
    /**
     * Popularizes the modifiers of the dish, that is, all the Group modifiers are preparing a group and dishes that correspond to them,
     * And ordinary modifiers are preparing their dish.
     * @param dish
     */
    async getDishModifiers(dish) {
        if (dish.modifiers) {
            let index = 0;
            // group modofiers
            for await (let modifier of dish.modifiers) {
                let childIndex = 0;
                let childModifiers = [];
                // assign group
                console.log("GETMMM", {
                    id: modifier.modifierId,
                    rmsId: modifier.id
                });
                if (dish.modifiers[index].modifierId !== undefined || dish.modifiers[index].id !== undefined) {
                    let criteria = {};
                    if (modifier.modifierId) {
                        criteria["id"] = modifier.modifierId;
                    }
                    else if (modifier.id) {
                        criteria["rmsId"] = modifier.id;
                    }
                    else {
                        throw `Group modifierId or rmsId not found`;
                    }
                    dish.modifiers[index].group = await Group.findOne(criteria);
                }
                if (!modifier.childModifiers)
                    modifier.childModifiers = [];
                for await (let childModifier of modifier.childModifiers) {
                    let criteria = {};
                    if (childModifier.modifierId) {
                        criteria["id"] = childModifier.modifierId;
                    }
                    else if (childModifier.id) {
                        criteria["rmsId"] = childModifier.id;
                    }
                    else {
                        throw `Dish modifierId or rmsId not found`;
                    }
                    let childModifierDish = await Dish.findOne(criteria).populate('images');
                    if (!childModifierDish || (childModifierDish && childModifierDish.balance === 0)) {
                        // delete if dish not found
                        sails.log.warn("DISH > getDishModifiers: Modifier " + childModifier.modifierId + " from dish:" + dish.name + " not found");
                    }
                    else {
                        try {
                            childModifier.dish = childModifierDish;
                            childModifiers.push(childModifier);
                        }
                        catch (error) {
                            sails.log.error("DISH > getDishModifiers: problem with: " + childModifier.modifierId + " in dish:" + dish.name);
                        }
                    }
                    childIndex++;
                }
                // 
                dish.modifiers[index].childModifiers = childModifiers;
                // If groupMod not have options delete it
                if (modifier.childModifiers && !modifier.childModifiers.length) {
                    sails.log.warn("DISH > getDishModifiers: GroupModifier " + modifier.id + " from dish:" + dish.name + " not have modifiers");
                    dish.modifiers.splice(index, 1);
                }
                index++;
            }
        }
        return dish;
    },
    async display(criteria) {
        const dishes = await Dish.find(criteria);
        const discountAdapter = adapters_1.Adapter.getPromotionAdapter();
        let updatedDishes = [];
        for (let i = 0; i < dishes.length; i++) {
            try {
                updatedDishes.push(discountAdapter.displayDish(dishes[i]));
            }
            catch (error) {
                sails.log(error);
                continue;
            }
        }
        return updatedDishes;
    },
    /**
     * Checks whether the dish exists, if it does not exist, then creates a new one and returns it.If exists, then checks
     * Hesh of the existing dish and new data, if they are identical, then immediately gives the dishes, if not, it updates its data
     * for new ones
     * @param values
     * @return Updated or created dish
     */
    async createOrUpdate(values) {
        sails.log.silly(`Core > Dish > createOrUpdate: ${values.name}`);
        let hash = (0, hashCode_1.default)(JSON.stringify(values));
        let criteria = {};
        if (values.id) {
            criteria['id'] = values.id;
        }
        else if (values.rmsId) {
            criteria['rmsId'] = values.rmsId;
        }
        else {
            throw `no id/rmsId provided`;
        }
        const dish = await Dish.findOne(criteria);
        if (!dish) {
            return await Dish.create({ hash, ...values }).fetch();
        }
        else {
            if (hash === dish.hash) {
                return dish;
            }
            return (await Dish.update(criteria, { hash, ...values }).fetch())[0];
        }
    },
};
module.exports = {
    primaryKey: "id",
    attributes: attributes,
    ...Model,
};
