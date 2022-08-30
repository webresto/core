"use strict";
/**
 * @api {API} Dish Dish
 * @apiGroup Models
 * @apiDescription Модель блюда
 *
 * @apiParam {String} id Уникальный идентификатор
 * @apiParam {String} additionalInfo Дополнительная информация
 * @apiParamExample {JSON} additionalInfo
 * {
 *   workTime: [
 *    {
 *     dayOfWeek: 'monday',
 *     start: '8:00',
 *     end: '18:00'
 *    },
 *   ],
 *   visible: true|false,
 *   promo: true|false,
 *   modifier: true|false
 * }
 * @apiParam {String} code Артикул
 * @apiParam {String} description Описание
 * @apiParam {String} name Название
 * @apiParam {String} seoDescription SEO-описание для клиента
 * @apiParam {String} seoKeywords SEO-ключевые слова
 * @apiParam {String} seoText SEO-текст для роботов
 * @apiParam {String} seoTitle SEO-заголовок
 * @apiParam {Float} carbohydrateAmount Количество углеводов на 100 г блюда
 * @apiParam {Float} carbohydrateFullAmount Количество углеводов в блюде
 * @apiParam {Array} differentPricesOn Список терминалов, на которых цена продукта отличается от стандартной и цен на них
 * @apiParam {Boolean} doNotPrintInCheque Блюдо не нужно печатать на чеке. Актуально только для модификаторов
 * @apiParam {Float} energyAmount Энергетическая ценность на 100 г блюда
 * @apiParam {Float} energyFullAmount Энергетическая ценность в блюде
 * @apiParam {Float} fatAmount Количество жиров на 100 г блюда
 * @apiParam {Float} fatFullAmount Количество жиров в блюде
 * @apiParam {Float} fiberAmount Количество белков на 100 г блюда
 * @apiParam {Float} fiberFullAmount Количество белков в блюде
 * @apiParam {String} groupId Идентификатор группы
 * @apiParam {Array} groupModifiers Групповые модификаторы (не используется в пользу modifiers)
 * @apiParam {String} measureUnit Единица измерения товара ( кг, л, шт, порц.)
 * @apiParam {Float} price Цена
 * @apiParam {[Group](#api-Models-ApiGroup)} productCategoryId Идентификатор категории продукта
 * @apiParam {Array} prohibitedToSaleOn Список ID терминалов, на которых продукт запрещен к продаже
 * @apiParam {String} type Тип:
 dish - блюдо
 good - товар
 modifier - модификатор
 * @apiParam {Boolean} useBalanceForSell Товар продается на вес
 * @apiParam {Float} weight Вес одной единицы в кг
 * @apiParam {Boolean} isIncludedInMenu Нужно ли продукт отображать в дереве номенклатуры
 * @apiParam {Float} order Порядок отображения
 * @apiParam {Boolean} isDeleted Удалён ли продукт в меню, отдаваемого клиенту
 * @apiParam {JSON} modifiers Модификаторы доступные для данного блюда
 * @apiParam {[Group](#api-Models-ApiGroup)} parentGroup Группа, к которой принадлежит блюдо
 * @apiParam {JSON} tags Тэги
 * @apiParam {Integer} balance Количество оставшихся блюд. -1 - бесконечно
 * @apiParam {[Image](#api-Models-ApiImage)[]} images Картинки блюда
 * @apiParam {Integer} itemTotal
 * @apiParam {String} slug Текстовое названия блюда в транслите
 * @apiParam {Integer} hash Хеш данного состояния блюда
 * @apiParam {String} composition Состав блюда
 *
 */
Object.defineProperty(exports, "__esModule", { value: true });
const checkExpression_1 = require("../lib/checkExpression");
const hashCode_1 = require("../lib/hashCode");
const getEmitter_1 = require("../lib/getEmitter");
const slugify_1 = require("slugify");
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
        isModificable: 'boolean',
        modifiers: {
            // collection: 'dish'
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
            type: 'string'
        },
        hash: 'string',
        composition: 'string',
        visible: 'boolean',
        modifier: 'boolean',
        promo: 'boolean',
        workTime: 'json'
    },
    beforeUpdate: function (record, proceed) {
        (0, getEmitter_1.default)().emit('core:dish-before-update', record);
        return proceed();
    },
    beforeCreate: function (init, proceed) {
        init.slug = (0, slugify_1.default)(init.name, { remove: /[*+~.()'"!:@\\\/]/g, lower: true, strict: true, locale: 'en' });
        (0, getEmitter_1.default)().emit('core:dish-before-create', init);
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
        if (!await SystemInfo.use('ShowUnavailableDishes')) {
            criteria.balance = { '!': 0 };
        }
        let dishes = await Dish.find(criteria).populate('images');
        await Promise.each(dishes, async (dish) => {
            const reason = (0, checkExpression_1.default)(dish);
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
        await (0, getEmitter_1.default)().emit('core-dish-get-dishes', dishes);
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
            for await (let modifier of dish.modifiers) {
                // group modofiers
                // assign group
                if (dish.modifiers[index].modifierId !== undefined) {
                    dish.modifiers[index].group = await Group.findOne({ id: modifier.modifierId });
                }
                let childIndex = 0;
                let childModifiers = [];
                for await (let childModifier of modifier.childModifiers) {
                    let childModifierDish = await Dish.findOne({ id: childModifier.modifierId }).populate('images');
                    if (!childModifierDish || (childModifierDish && childModifierDish.balance === 0)) {
                        // delete if dish not found
                        sails.log.error("DISH > getDishModifiers: Modifier " + childModifier.modifierId + " from dish:" + dish.name + " not found");
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
                if (modifier.childModifiers && !modifier.childModifiers.length > 0) {
                    sails.log.error("DISH > getDishModifiers: GroupModifier " + modifier.id + " from dish:" + dish.name + " not have modifiers");
                    dish.modifiers.splice(index, 1);
                }
                index++;
            }
        }
        dish.groupModifiers = null;
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
            return Dish.create({ hash, ...values });
        }
        else {
            if (hash === dish.hash) {
                return dish;
            }
            return (await Dish.update({ id: values.id }, { hash, ...values }))[0];
        }
    }
};
