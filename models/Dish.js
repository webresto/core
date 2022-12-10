"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const checkExpression_1 = require("../libs/checkExpression");
const hashCode_1 = require("../libs/hashCode");
const getEmitter_1 = require("../libs/getEmitter");
const uuid_1 = require("uuid");
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
    /** Артикул */
    code: {
        type: "string",
        allowNull: true,
    },
    /** Описание блюда */
    description: {
        type: "string",
        allowNull: true,
    },
    /** Наименование */
    name: {
        type: "string",
        //required: true,
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
    /** Не печатать в чеке */
    doNotPrintInCheque: "boolean",
    /** Количество углеводов на (100гр)*/
    carbohydrateAmount: "number",
    /** Количество углеводов в блюде */
    carbohydrateFullAmount: "number",
    /** Енергетическая ценность (100гр) */
    energyAmount: "number",
    /** Енергетическая ценность */
    energyFullAmount: "number",
    /**  Колличество жиров (100гр) */
    fatAmount: "number",
    /** Колличество жиров в блюде */
    fatFullAmount: "number",
    /** Количество белков (100гр)  */
    fiberAmount: "number",
    /** Количество белков в блюде */
    fiberFullAmount: "number",
    /** Идентификатор группы в которой находится блюдо */
    groupId: {
        type: "string",
        allowNull: true,
    },
    /** Единица измерения товара ( кг, л, шт, порц.) */
    measureUnit: {
        type: "string",
        allowNull: true,
    },
    /** Цена блюда */
    price: "number",
    /**  */
    productCategoryId: {
        type: "string",
        allowNull: true,
    },
    /** Тип */
    type: "string",
    /** Масса  */
    weight: "number",
    /** Порядок сортировки */
    order: "number",
    /** Блюдо удалено */
    isDeleted: "boolean",
    /** Блюдо может быть модифичироанно */
    isModificable: "boolean",
    /** Модифакторы блюда */
    modifiers: {
        // collection: 'dish'
        type: "json",
    },
    /** Родительская группа */
    parentGroup: {
        model: "group",
    },
    /** Теги для фильтрации (Вегетарианский, острый...) */
    tags: {
        type: "json",
    },
    /** Баланс для продажи, если -1 то сколько угодно */
    balance: {
        type: "number",
        defaultsTo: -1,
    },
    /** Список изображений блюда*/
    images: {
        collection: "mediafile",
        via: "dish",
    },
    /** Слаг */
    slug: {
        type: "string",
    },
    /** Концепт к которому относится блюдо */
    concept: "string",
    /** Хеш обекта блюда */
    hash: "string",
    /** Можно увидеть на сайте в меню */
    visible: "boolean",
    /** Признак что это модификатор */
    modifier: "boolean",
    /** Признак того что блюдо акционное */
    promo: "boolean",
    /** Время работы */
    worktime: "json",
};
let Model = {
    beforeCreate(init, next) {
        (0, getEmitter_1.default)().emit('core:dish-before-create', init);
        if (!init.id) {
            init.id = (0, uuid_1.v4)();
        }
        if (!init.concept) {
            init.concept = "origin";
        }
        next();
    },
    beforeUpdate: function (record, proceed) {
        (0, getEmitter_1.default)().emit('core:dish-before-update', record);
        return proceed();
    },
    afterUpdate: function (record, proceed) {
        (0, getEmitter_1.default)().emit('core:dish-after-update', record);
        return proceed();
    },
    afterCreate: function (record, proceed) {
        (0, getEmitter_1.default)().emit('core:dish-after-create', record);
        return proceed();
    },
    /**
     * Принимает waterline criteria и дописывает, туда isDeleted = false, balance != 0. Таким образом эта функция позволяет
     * находить в базе блюда по критерию и при этом такие, что с ними можно работать юзеру.
     * @param criteria - критерии поиска
     * @return найденные блюда
     */
    async getDishes(criteria = {}) {
        criteria.isDeleted = false;
        if (!(await Settings.get("ShowUnavailableDishes"))) {
            criteria.balance = { "!": 0 };
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
        dishes.sort((a, b) => a.order - b.order);
        await (0, getEmitter_1.default)().emit("core-dish-get-dishes", dishes);
        return dishes;
    },
    /**
     * Популяризирует модификаторы блюда, то есть всем груповым модификаторам дописывает группу и блюда, которые им соответствуют,
     * а обычным модификаторам дописывает их блюдо.
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
                if (dish.modifiers[index].modifierId !== undefined) {
                    dish.modifiers[index].group = await Group.findOne({ id: modifier.modifierId });
                }
                if (!modifier.childModifiers)
                    modifier.childModifiers = [];
                for await (let childModifier of modifier.childModifiers) {
                    let childModifierDish = await Dish.findOne({ id: childModifier.modifierId }).populate('images');
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
    /**
     * Проверяет существует ли блюдо, если не сущестует, то создаёт новое и возвращает его. Если существует, то сверяет
     * хеш существующего блюда и новых данных, если они идентифны, то сразу же отдаёт блюда, если нет, то обновляет его данные
     * на новые
     * @param values
     * @return обновлённое или созданное блюдо
     */
    async createOrUpdate(values) {
        let hash = (0, hashCode_1.default)(JSON.stringify(values));
        const dish = await Dish.findOne({ id: values.id });
        if (!dish) {
            return Dish.create({ hash, ...values }).fetch();
        }
        else {
            if (hash === dish.hash) {
                return dish;
            }
            return (await Dish.update({ id: values.id }, { hash, ...values }).fetch())[0];
        }
    },
};
module.exports = {
    primaryKey: "id",
    attributes: attributes,
    ...Model,
};
