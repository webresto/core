"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const checkExpression_1 = __importDefault(require("../libs/checkExpression"));
const uuid_1 = require("uuid");
const adapters_1 = require("../adapters");
const slugIt_1 = require("../libs/slugIt");
const ProductCatalog_1 = require("../libs/adminpanel/ProductCatalog/ProductCatalog");
let attributes = {
    /**Id */
    id: {
        type: "string",
        //required: true,
    },
    /** ID in external system */
    rmsId: {
        type: "string",
        //required: true,
    },
    /** Additional info */
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
    recommendations: {
        collection: "group",
        via: 'recommendedBy',
    },
    recommendedBy: {
        collection: "group",
        via: 'recommendations',
    },
    /** Icon */
    icon: {
        type: "string",
        allowNull: true
    },
    /** Images */
    images: {
        collection: "mediafile",
        via: "group",
    },
    /** Placeholder for group dishes */
    dishesPlaceholder: {
        model: "mediafile",
    },
    /** The human easy readable*/
    slug: {
        type: "string",
        unique: process.env.UNIQUE_SLUG === "1"
    },
    /** The concept to which the group belongs */
    concept: "string",
    /** The group is displayed*/
    visible: "boolean",
    /**A group of modifiers */
    modifier: "boolean",
    /**  A sign that this is a promo group
     *  The promo group cannot be added from the user.
     */
    promo: "boolean",
    /** Working hours */
    worktime: "json",
    customData: "json",
};
exports.default = ProductCatalog_1.Group;
let Model = {
    beforeCreate: async function (init, cb) {
        emitter.emit('core:group-before-create', init);
        if (!init.id) {
            init.id = (0, uuid_1.v4)();
        }
        if (!init.concept) {
            init.concept = "origin";
        }
        init.visible = init.visible ?? true;
        const slugOpts = [];
        if (init.concept !== "origin" && process.env.UNIQUE_SLUG === "1") {
            slugOpts.push(init.concept);
        }
        init.slug = await (0, slugIt_1.slugIt)("group", init.name, "slug", slugOpts);
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
     * Returns an object with groups and errors of obtaining these very groups.
     * @deprecated not used
     * @param groupsId - array of ID groups that should be obtained
     * @return Object {
     *   groups: [],
     *   errors: {}
     * }
     * where Groups is an array, requested groups with a complete display of investment, that is, with their dishes, the dishes are their modifiers
     * and pictures, there are pictures of the group, etc., and errors is an object in which the keys are groups that cannot be obtained
     * According to some dinich, the values of this object are the reasons why the group was not obtained.
     * @fires group:core:group-get-groups - The result of execution in format {groups: {[groupId]:Group}, errors: {[groupId]: error}}
     */
    async getGroups(groupsId) {
        let menu = {};
        const groups = await ProductCatalog_1.Group.find({ where: {
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
                    const cgs = await ProductCatalog_1.Group.find({
                        id: group.childGroups.map((cg) => cg.id),
                        isDeleted: false
                    })
                        .populate("childGroups")
                        .populate("dishes")
                        .populate("images");
                    for await (let cg of cgs) {
                        try {
                            const data = await ProductCatalog_1.Group.getGroup(cg.id);
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
        await emitter.emit("core:group-get-groups", menu, errors);
        const res = Object.values(menu);
        //TODO: rewrite with throw
        return { groups: res, errors: errors };
    },
    /**
     * Returns a group with a given ID
     * @deprecated not used
     * @param groupId - ID groups
     * @return The requested group
     * @throws The error of obtaining a group
     * @fires group:core:group-get-groups - The result of execution in the format {Groups: {[Groupid]: Group}, Errors: {[Groupid]: error}}
     */
    async getGroup(groupId) {
        const result = await ProductCatalog_1.Group.getGroups([groupId]);
        if (result.errors[0]) {
            throw result.errors[0];
        }
        const group = result.groups;
        return group[0] ? group[0] : null;
    },
    /**
     * Returns a group with a given Slug
     * @deprecated not used
     * @param groupSlug - Slug groups
     * @return The requested group
     * @throws The error of obtaining a group
     * @fires group:core:group-get-groups - The result of execution in the format {Groups: {[Groupid]: Group}, Errors: {[Groupid]: error}}
     */
    async getGroupBySlug(groupSlug) {
        if (!groupSlug)
            throw "groupSlug is required";
        const groupObj = await ProductCatalog_1.Group.findOne({ slug: groupSlug });
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
    // use this method to get a group modified by adapters
    // https://github.com/balderdashy/waterline/pull/902
    async display(criteria) {
        const promotionAdapter = adapters_1.Adapter.getPromotionAdapter();
        const groups = await ProductCatalog_1.Group.find(criteria);
        // Set virtual default
        groups.forEach((group) => {
            group.discountAmount = 0;
            group.discountType = null;
        });
        let updatedDishes = [];
        for (let i = 0; i < groups.length; i++) {
            try {
                updatedDishes.push(promotionAdapter.displayGroup(groups[i]));
            }
            catch (error) {
                sails.log.error(error);
                continue;
            }
        }
        return updatedDishes;
    },
    // Recursive function to get all child groups
    async getMenuTree(menu, option = "only_ids") {
        if (option === "tree") {
            throw `not implemented yet`;
        }
        if (!menu) {
            menu = await ProductCatalog_1.Group.getMenuGroups();
        }
        let allGroups = [];
        for (let group of menu) {
            const groupId = group.id;
            const initialGroup = (await ProductCatalog_1.Group.find({ id: groupId, isDeleted: false }).sort('createdAt DESC')).shift();
            if (initialGroup) {
                allGroups.push(initialGroup);
                const childGroups = await getAllChildGroups(groupId);
                allGroups = allGroups.concat(childGroups);
                allGroups.sort((a, b) => a.sortOrder - b.sortOrder);
            }
        }
        async function getAllChildGroups(groupId) {
            let childGroups = await ProductCatalog_1.Group.find({ parentGroup: groupId, isDeleted: false });
            let allChildGroups = [];
            for (let group of childGroups) {
                allChildGroups.push(group);
                const subChildGroups = await getAllChildGroups(group.id);
                allChildGroups = allChildGroups.concat(subChildGroups);
            }
            allChildGroups.sort((a, b) => a.sortOrder - b.sortOrder);
            return allChildGroups;
        }
        if (option === "flat_tree") {
            return allGroups;
        }
        if (option === "only_ids") {
            return allGroups.map(group => group.id);
        }
    },
    /**
     * Menu for navbar
     * */
    async getMenuGroups(concept, topLevelGroupId) {
        let groups = [];
        emitter.emit('core:group-get-menu', groups, concept);
        // Default logic
        if (!groups.length) {
            /**
             * Check all option from settings to detect TopLevelGroupId
             */
            if (!topLevelGroupId) {
                let menuTopLevelSlug = undefined;
                if (concept !== undefined) {
                    menuTopLevelSlug = await Settings.get(`SLUG_MENU_TOP_LEVEL_CONCEPT_${concept.toUpperCase()}`);
                }
                if (menuTopLevelSlug === undefined) {
                    menuTopLevelSlug = await Settings.get(`SLUG_MENU_TOP_LEVEL`);
                }
                if (menuTopLevelSlug) {
                    let menuTopLevelGroup = await ProductCatalog_1.Group.findOne({
                        slug: menuTopLevelSlug,
                        ...concept && { concept: concept }
                    });
                    if (menuTopLevelGroup) {
                        topLevelGroupId = menuTopLevelGroup.id;
                    }
                }
            }
            groups = await ProductCatalog_1.Group.find({
                parentGroup: topLevelGroupId ?? null,
                ...concept && { concept: concept },
                isDeleted: false,
                modifier: false,
                visible: true
            });
            // Check subgroups when one group in the top menu
            if (groups.length === 1 && topLevelGroupId === undefined) {
                let children = await ProductCatalog_1.Group.find({
                    parentGroup: groups[0].id,
                    isDeleted: false,
                    modifier: false,
                    visible: true
                });
                if (children)
                    groups = children;
            }
        }
        return groups.sort((a, b) => a.sortOrder - b.sortOrder);
    },
    /**
     * Static method for obtaining recommended dishes by group.
     * @param {string[]} ids - An array of group IDs.
     * @param {number} [limit=15] - Optional number of dishes to be returned.
     * @param {boolean} [includeReverse=false] - Include reverse recommendations.
     * @returns {Promise<object[]>} - An array of recommended dishes.
     */
    async getRecommendedDishes(ids, limit = 12, includeReverse = true) {
        if (!Array.isArray(ids) || ids.length === 0) {
            throw new Error('You must provide an array of IDs.');
        }
        const baseCriteriaGroup = {
            isDeleted: false
        };
        const groupLimit = Math.round(ids.length / limit);
        const groups = await sails.models.group.find({
            where: {
                id: ids,
                ...baseCriteriaGroup
            }
        }).populate('recommendations', {
            limit: groupLimit
        }).populate('recommendedBy', {
            limit: includeReverse ? groupLimit : 0
        });
        let recommendedGroupIds = groups.reduce((acc, group) => {
            return acc.concat(group.recommendations.map((rec) => rec.id));
        }, []);
        if (includeReverse) {
            groups.forEach((group) => {
                recommendedGroupIds = recommendedGroupIds.concat(group.recommendedBy.map((rec) => rec.id));
            });
        }
        const baseCriteriaDish = {
            balance: { "!=": 0 },
            modifier: false,
            isDeleted: false
        };
        let recommendedDishes = await sails.models.dish.find({
            where: {
                parentGroup: recommendedGroupIds,
                ...baseCriteriaDish
            }
        });
        recommendedDishes = [...new Set(recommendedDishes.map((dish) => dish.id))].map(id => recommendedDishes.find((dish) => dish.id === id));
        // Fisher-Yates algrythm
        recommendedDishes = recommendedDishes.sort(() => Math.random() - 0.5);
        if (limit && Number.isInteger(limit) && limit > 0) {
            recommendedDishes = recommendedDishes.slice(0, limit);
        }
        return recommendedDishes;
    },
    /**
     * Checks whether the group exists, if it does not exist, then creates a new one and returns it.
     * @param values
     * @return Updated or created group
     */
    async createOrUpdate(values) {
        sails.log.silly(`Core > Group > createOrUpdate: ${values.name}`);
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
        const group = await ProductCatalog_1.Group.findOne(criteria);
        if (!group) {
            return ProductCatalog_1.Group.create(values).fetch();
        }
        else {
            return (await ProductCatalog_1.Group.update(criteria, values).fetch())[0];
        }
    },
};
module.exports = {
    primaryKey: "id",
    attributes: attributes,
    ...Model,
};
