"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const checkExpression_1 = require("../libs/checkExpression");
const getEmitter_1 = require("../libs/getEmitter");
let attributes = {
    /**Id */
    id: {
        type: "number",
        autoIncrement: true,
    },
    /** Addishinal info */
    additionalInfo: {
        type: "string",
        allowNull: true,
    },
    /** */
    code: {
        type: "string",
        allowNull: true,
    },
    description: "string",
    /** Удалён ли продукт в меню, отдаваемого клиенту */
    isDeleted: "boolean",
    /** Наименование блюда */
    name: "string",
    seoDescription: "string",
    seoKeywords: "string",
    seoText: "string",
    seoTitle: "string",
    /** Нужно ли продукт отображать в дереве номенклатуры */
    isIncludedInMenu: "boolean",
    /** Очередь сортировки */
    order: "number",
    /** Блюда группы */
    dishes: {
        collection: "dish",
        via: "parentGroup",
    },
    /** Родительская группа */
    parentGroup: {
        model: "group",
    },
    /** Дочерние группы */
    childGroups: {
        collection: "group",
        via: "parentGroup",
    },
    /** Изображения */
    images: {
        collection: "image",
        via: "group",
    },
    /** Человеко читаемый АйДи */
    slug: {
        type: "string"
    },
    /** Гурппа отображается */
    visible: "boolean",
    /** Группа модификаторов */
    modifier: "boolean",
    /** Промо группа */
    promo: "boolean",
    /** Время работы горуппы */
    workTime: "json",
};
let Model = {
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
     * @fires group:core-group-get-groups - результат выполнения в формате {groups: {[groupId]:Group}, errors: {[groupId]: error}}
     */
    async getGroups(groupsId) {
        let menu = {};
        const groups = await Group.find({
            id: groupsId,
            isDeleted: false,
        })
            .populate("childGroups")
            .populate("dishes")
            .populate("images");
        const errors = {};
        await Promise.each(groups, async (group) => {
            const reason = checkExpression_1.default(group);
            if (!reason) {
                menu[group.id] = group;
                if (group.childGroups) {
                    let childGroups = [];
                    const cgs = await Group.find({
                        id: group.childGroups.map((cg) => cg.id),
                    })
                        .populate("childGroups")
                        .populate("dishes")
                        .populate("images");
                    await Promise.each(cgs, async (cg) => {
                        try {
                            const data = await Group.getGroup(cg.id);
                            if (data)
                                childGroups.push(data);
                        }
                        catch (e) { }
                    });
                    delete menu[group.id].childGroups;
                    menu[group.id].children = childGroups;
                    if (menu[group.id].children.length > 1)
                        menu[group.id].children.sort((a, b) => a.order - b.order);
                }
                menu[group.id].dishesList = await Dish.getDishes({
                    parentGroup: group.id,
                });
            }
            else {
                errors[group.id] = reason;
            }
        });
        await getEmitter_1.default().emit("core-group-get-groups", menu, errors);
        const res = Object.values(menu);
        //TODO: rewrite with throw
        return { groups: res, errors: errors };
    },
    /**
     * Возвращает группу с заданным id
     * @param groupId - id группы
     * @return запрашиваемая группа
     * @throws ошибка получения группы
     * @fires group:core-group-get-groups - результат выполнения в формате {groups: {[groupId]:Group}, errors: {[groupId]: error}}
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
     * @fires group:core-group-get-groups - результат выполнения в формате {groups: {[groupId]:Group}, errors: {[groupId]: error}}
     */
    async getGroupBySlug(groupSlug) {
        const groupObj = await Group.findOne({ slug: groupSlug });
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
    },
};
module.exports = {
    primaryKey: "id",
    attributes: attributes,
    ...Model,
};
