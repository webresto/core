"use strict";
/**
 * @api {API} Group Group
 * @apiGroup Models
 * @apiDescription Группы. Содержат в себе блюда и другие группы
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
 * @apiParam {Float} code Артикул
 * @apiParam {String} description Описание
 * @apiParam {Boolean} isDeleted Удалён ли продукт в меню, отдаваемого клиенту
 * @apiParam {String} name Название
 * @apiParam {String} seoDescription SEO-описание для клиента
 * @apiParam {String} seoKeywords SEO-ключевые слова
 * @apiParam {String} seoText SEO-текст для роботов
 * @apiParam {String} seoTitle SEO-заголовок
 * @apiParam {Tags} tags Тэги
 * @apiParam {Boolean} isIncludedInMenu Нужно ли продукт отображать в дереве номенклатуры
 * @apiParam {Float} order Порядок отображения
 * @apiParam {Tags[]} dishesTags Тэги всех блюд, что есть в этой группе
 * @apiParam {[Dish](#api-Models-ApiDish)[]} dishes Блюда, содержашиеся в этой группе
 * @apiParam {[Group](#api-Models-ApiGroup)} parentGroup Родительская группа
 * @apiParam {[Group](#api-Models-ApiGroup)[]} childGroups Дочерние группы
 * @apiParam {[Image](#api-Models-ApiImage)[]} images Картинки группы
 * @apiParam {String} slug Текстовое названия группы в транслите
 *
 */
Object.defineProperty(exports, "__esModule", { value: true });
const checkExpression_1 = require("../lib/checkExpression");
const getEmitter_1 = require("../lib/getEmitter");
const slugify_1 = require("slugify");
module.exports = {
    attributes: {
        id: {
            type: 'string',
            required: true,
            primaryKey: true
        },
        additionalInfo: 'string',
        code: 'float',
        description: 'string',
        isDeleted: 'boolean',
        name: 'string',
        seoDescription: 'string',
        seoKeywords: 'string',
        seoText: 'string',
        seoTitle: 'string',
        tags: {
            // collection: 'tags'
            type: 'json'
        },
        isIncludedInMenu: 'boolean',
        order: 'float',
        dishesTags: {
            // collection: 'tags'
            type: 'json'
        },
        dishes: {
            collection: 'dish',
            via: 'parentGroup'
        },
        parentGroup: {
            model: 'group'
        },
        childGroups: {
            collection: 'group',
            via: 'parentGroup'
        },
        images: {
            collection: 'image',
            via: 'group'
        },
        dishPlaceholder: {
            model: "image",
        },
        slug: {
            type: 'string'
        },
        visible: 'boolean',
        modifier: 'boolean',
        promo: 'boolean',
        workTime: 'json',
    },
    beforeUpdate: function (record, proceed) {
        (0, getEmitter_1.default)().emit('core:group-before-update', record);
        return proceed();
    },
    beforeCreate: function (init, proceed) {
        (0, getEmitter_1.default)().emit('core:group-before-create', init);
        init.slug = (0, slugify_1.default)(init.name, { remove: /[*+~.()'"!:@\\\/]/g, lower: true, strict: true, locale: 'en' });
        return proceed();
    },
    afterUpdate: function (record, proceed) {
        (0, getEmitter_1.default)().emit('core:group-after-update', record);
        return proceed();
    },
    afterCreate: function (record, proceed) {
        (0, getEmitter_1.default)().emit('core:group-after-create', record);
        return proceed();
    },
    /**
     * Возвращает объект с группами и ошибками получения этих самых групп.
     * @param groupsId - массив id групп, которые следует получить
     * @return Object {
     *   groups: [],
     *   errors: {}
     * }
     * где groups это массив, запрошеных групп с полным отображением вложенности, то есть с их блюдами, у блюд их модфикаторы
     * и картинки, есть картинки группы и тд, а errors это объект, в котором ключи это группы, которые невозможно получить
     * по некоторой приниче, значения этого объекта это причины по которым группа не была получена.
     */
    async getGroups(groupsId) {
        let menu = {};
        const groups = await Group.find({
            id: groupsId,
            isDeleted: false
        }).populate('childGroups')
            .populate('dishes')
            .populate('images');
        const errors = {};
        await Promise.each(groups, async (group) => {
            const reason = (0, checkExpression_1.default)(group);
            if (!reason) {
                menu[group.id] = group;
                if (group.childGroups) {
                    let childGroups = [];
                    const cgs = await Group.find({ id: group.childGroups.map(cg => cg.id) })
                        .populate('childGroups')
                        .populate('dishes')
                        .populate('images');
                    await Promise.each(cgs, async (cg) => {
                        try {
                            const data = await Group.getGroup(cg.id);
                            if (data)
                                childGroups.push(data);
                        }
                        catch (e) {
                        }
                    });
                    delete menu[group.id].childGroups;
                    menu[group.id].children = childGroups;
                    if (menu[group.id].children.length > 1)
                        menu[group.id].children.sort((a, b) => a.order - b.order);
                }
                menu[group.id].dishesList = await Dish.getDishes({ parentGroup: group.id });
            }
            else {
                errors[group.id] = reason;
            }
        });
        await (0, getEmitter_1.default)().emit('core-group-get-groups', menu, errors);
        const res = Object.values(menu);
        //TODO: rewrite with throw
        return { groups: res, errors: errors };
    },
    /**
     * Возвращает группу с заданным id
     * @param groupId - id группы
     * @return запрашиваемая группа
     * @throws ошибка получения группы
     */
    async getGroup(groupId) {
        const result = await this.getGroups([groupId]);
        if (result.errors[0]) {
            throw result.errors[0];
        }
        const group = result.groups;
        return group[0] ? group[0] : null;
    },
    /**
     * Возвращает группу с заданным slug'ом
     * @param groupSlug - slug группы
     * @return запрашиваемая группа
     * @throws ошибка получения группы
     */
    async getGroupBySlug(groupSlug) {
        const groupObj = (await Group.findOne({ slug: groupSlug }));
        if (!groupObj) {
            throw "group with slug " + groupSlug + " not found";
        }
        const result = await this.getGroups([groupObj.id]);
        if (result.errors[0]) {
            throw result.errors[0];
        }
        const group = result.groups;
        return group[0] ? group[0] : null;
    },
    /**
     * Проверяет существует ли группа, если не сущестует, то создаёт новую и возвращает её.
     * @param values
     * @return обновлённая или созданная группа
     */
    async createOrUpdate(values) {
        const group = await Group.findOne({ id: values.id });
        if (!group) {
            return Group.create(values);
        }
        else {
            return (await Group.update({ id: values.id }, values))[0];
        }
    }
};
