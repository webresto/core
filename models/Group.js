"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const checkExpression_1 = require("../libs/checkExpression");
const getEmitter_1 = require("../libs/getEmitter");
const slugify_1 = require("slugify");
let attributes = {
    /**Id */
    id: {
        type: "string",
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
    description: {
        type: "string",
        allowNull: true,
    },
    /** Удалён ли продукт в меню, отдаваемого клиенту */
    isDeleted: "boolean",
    /** Наименование блюда */
    name: {
        type: "string",
        required: true,
    },
    seoDescription: {
        type: "string",
        allowNull: true,
    },
    seoKeywords: {
        type: "string",
        allowNull: true,
    },
    seoText: {
        type: "string",
        allowNull: true,
    },
    seoTitle: {
        type: "string",
        allowNull: true,
    },
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
    /** Плейсхолдер для блюд группы */
    dishesPlaceholder: {
        model: "image",
    },
    /** Человеко читаемый АйДи */
    slug: {
        type: "string",
    },
    /** Гурппа отображается */
    visible: "boolean",
    /** Группа модификаторов */
    modifier: "boolean",
    /** Промо группа */
    promo: "boolean",
    /** Время работы гыруппы */
    workTime: "json",
};
let Model = {
    beforeCreate: async function (initGroup, proceed) {
        if (!initGroup.slug) {
            initGroup.slug = slugify_1.default(initGroup.name);
        }
        // icrease 1 if group present
        async function getSlug(slug, salt) {
            let _slug = slug;
            if (salt)
                _slug = slug + "-" + salt;
            if ((await Group.find({ slug: _slug })).length) {
                getSlug(slug, salt + 1);
            }
            else {
                return slug + salt;
            }
        }
        await getSlug(initGroup.slug);
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
     * @fires group:core-group-get-groups - результат выполнения в формате {groups: {[groupId]:Group}, errors: {[groupId]: error}}
     */
    async getGroups(groupsId) {
        let menu = {};
        const groups = await Group.find({ where: {
                id: groupsId,
                isDeleted: false,
            } })
            .populate("childGroups")
            .populate("dishes")
            .populate("images");
        const errors = {};
        for await (let group of groups) {
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
                    for await (let cg of cgs) {
                        try {
                            const data = await Group.getGroup(cg.id);
                            if (data)
                                childGroups.push(data);
                        }
                        catch (e) { }
                    }
                    delete menu[group.id].childGroups;
                    menu[group.id].childGroups = childGroups;
                    if (menu[group.id].childGroups.length > 1)
                        menu[group.id].childGroups.sort((a, b) => a.order - b.order);
                }
                menu[group.id].dishesList = await Dish.getDishes({
                    parentGroup: group.id,
                });
            }
            else {
                errors[group.id] = reason;
            }
        }
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
        const result = await Group.getGroups([groupId]);
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
        if (!groupSlug)
            throw "groupSlug is required";
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
            return Group.create(values).fetch();
        }
        else {
            return (await Group.update({ id: values.id }, values).fetch())[0];
        }
    },
};
module.exports = {
    primaryKey: "id",
    attributes: attributes,
    ...Model,
};
