"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const checkExpression_1 = require("../libs/checkExpression");
const slugify_1 = require("slugify");
const uuid_1 = require("uuid");
let attributes = {
    /**Id */
    id: {
        type: "string",
        //required: true,
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
    /** Soft deletion */
    isDeleted: "boolean",
    /** Dishes group name*/
    name: {
        type: "string",
        //required: true,
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
    /** Sorting weight */
    sortOrder: "number",
    dishes: {
        collection: "dish",
        via: "parentGroup",
    },
    parentGroup: {
        model: "group",
    },
    childGroups: {
        collection: "group",
        via: "parentGroup",
    },
    /** Icon */
    icon: {
        model: "mediafile",
    },
    /** Images */
    images: {
        collection: "mediafile",
        via: "group",
    },
    /** Плейсхолдер для блюд группы */
    dishesPlaceholder: {
        model: "mediafile",
    },
    /** Человеко читаемый АйДи */
    slug: {
        type: "string",
    },
    /** Концепт к которому относится группа */
    concept: "string",
    /** Гурппа отображается */
    visible: "boolean",
    /** Группа модификаторов */
    modifier: "boolean",
    /** Промо группа */
    promo: "boolean",
    /** Время работы */
    worktime: "json",
};
let Model = {
    beforeCreate(init, cb) {
        emitter.emit('core:group-before-create', init);
        if (!init.id) {
            init.id = (0, uuid_1.v4)();
        }
        if (!init.concept) {
            init.concept = "origin";
        }
        init.slug = (0, slugify_1.default)(init.name, { remove: /[*+~.()'"!:@\\\/]/g, lower: true, strict: true, locale: 'en' });
        cb();
    },
    beforeUpdate: function (record, cb) {
        emitter.emit('core:group-before-update', record);
        return cb();
    },
    afterUpdate: function (record, cb) {
        emitter.emit('core:group-after-update', record);
        return cb();
    },
    afterCreate: function (record, cb) {
        emitter.emit('core:group-after-create', record);
        return cb();
    },
    /**
     * Возвращает объект с группами и ошибками получения этих самых групп.
     * @deprecated not used
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
                isDeleted: false
            } })
            .populate("childGroups")
            .populate("dishes")
            .populate("images");
        const errors = {};
        for await (let group of groups) {
            const reason = (0, checkExpression_1.default)(group);
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
                        menu[group.id].childGroups.sort((a, b) => a.sortOrder - b.sortOrder);
                }
                menu[group.id].dishesList = await Dish.getDishes({
                    parentGroup: group.id
                });
            }
            else {
                errors[group.id] = reason;
            }
        }
        await emitter.emit("core-group-get-groups", menu, errors);
        const res = Object.values(menu);
        //TODO: rewrite with throw
        return { groups: res, errors: errors };
    },
    /**
     * Возвращает группу с заданным id
     * @deprecated not used
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
     * Returns a group with a given Slug
     * @deprecated not used
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
     * Menu for navbar
     * */
    async getMenuGroups(concept, topLevelGroupId) {
        let groups = [];
        emitter.emit('core:group-get-menu', groups, concept);
        // Default logic
        if (!groups) {
            // TODO: Here should be find top level concept menu by Settings
            groups = await Group.find({
                parentGroup: topLevelGroupId ?? null,
                ...concept && { concept: concept }
            });
            // Check subgroups when one group in top menu
            if (groups.length === 1 && topLevelGroupId === undefined) {
                let childs = await Group.find({
                    parentGroup: groups[0].id,
                });
                if (childs)
                    groups = childs;
            }
        }
        else {
            // direct from emitter
            return groups;
        }
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
