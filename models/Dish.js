"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const checkExpression_1 = require("../lib/checkExpression");
const hashCode_1 = require("../lib/hashCode");
const getEmitter_1 = require("../lib/getEmitter");
module.exports = {
    attributes: {
        id: {
            type: 'string',
            required: true,
            primaryKey: true
        },
        rmsId: {
            type: 'string',
            required: true
        },
        additionalInfo: 'string',
        code: 'string',
        description: 'string',
        name: 'string',
        seoDescription: 'string',
        seoKeywords: 'string',
        seoText: 'string',
        seoTitle: 'string',
        carbohydrateAmount: 'float',
        carbohydrateFullAmount: 'float',
        differentPricesOn: 'array',
        doNotPrintInCheque: 'boolean',
        energyAmount: 'float',
        energyFullAmount: 'float',
        fatAmount: 'float',
        fatFullAmount: 'float',
        fiberAmount: 'float',
        fiberFullAmount: 'float',
        groupId: 'string',
        groupModifiers: 'array',
        measureUnit: 'string',
        price: 'float',
        productCategoryId: 'string',
        prohibitedToSaleOn: 'array',
        type: 'string',
        useBalanceForSell: 'boolean',
        weight: 'float',
        isIncludedInMenu: 'boolean',
        order: 'float',
        isDeleted: 'boolean',
        modifiers: {
            type: 'json'
        },
        parentGroup: {
            model: 'group'
        },
        tags: {
            type: 'json'
        },
        balance: {
            type: 'integer',
            defaultsTo: -1
        },
        images: {
            collection: 'image',
            via: 'dish'
        },
        slug: {
            type: 'slug',
            from: 'name'
        },
        hash: 'integer',
        composition: 'string',
        visible: 'boolean',
        modifier: 'boolean',
        promo: 'boolean',
        workTime: 'json'
    },
    async getDishes(criteria = {}) {
        criteria.isDeleted = false;
        if (!await SystemInfo.use('ShowUnavailableDishes')) {
            criteria.balance = { '!': 0 };
        }
        let dishes = await Dish.find(criteria).populate('images');
        await Promise.each(dishes, async (dish) => {
            const reason = checkExpression_1.default(dish);
            if (!reason) {
                await Dish.getDishModifiers(dish);
                if (dish.images.length >= 2)
                    dish.images.sort((a, b) => b.uploadDate.localeCompare(a.uploadDate));
            }
            else {
                dishes.splice(dishes.indexOf(dish), 1);
            }
        });
        dishes.sort((a, b) => a.order - b.order);
        await getEmitter_1.default().emit('core-dish-get-dishes', dishes);
        return dishes;
    },
    async getDishModifiers(dish) {
        await Promise.map(dish.modifiers, async (modifier, index) => {
            if (modifier.childModifiers && modifier.childModifiers.length > 0) {
                dish.modifiers[index].group = await Group.findOne({ id: modifier.modifierId });
                await Promise.map(modifier.childModifiers, async (modifier, index1) => {
                    dish.modifiers[index].childModifiers[index1].dish = await Dish.findOne({ id: modifier.modifierId });
                });
            }
            else {
                dish.modifiers[index].dish = await Dish.findOne({ id: modifier.id });
            }
        });
    },
    async createOrUpdate(values) {
        const dish = await Dish.findOne({ id: values.id });
        if (!dish) {
            return Dish.create(values);
        }
        else {
            if (hashCode_1.default(JSON.stringify(values)) === dish.hash) {
                return dish;
            }
            return (await Dish.update({ id: values.id }, values))[0];
        }
    }
};
