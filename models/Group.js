"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const checkExpression_1 = require("../lib/checkExpression");
const getEmitter_1 = require("../lib/getEmitter");
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
            type: 'json'
        },
        isIncludedInMenu: 'boolean',
        order: 'float',
        dishesTags: {
            type: 'json'
        },
        dishes: {
            collection: 'dish',
            via: 'productCategoryId'
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
        slug: {
            type: 'slug',
            from: 'name'
        },
        visible: 'boolean',
        modifier: 'boolean',
        promo: 'boolean',
        workTime: 'json'
    },
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
            const reason = checkExpression_1.default(group);
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
        await getEmitter_1.default().emit('core-group-get-groups', menu, errors);
        const res = Object.values(menu);
        return { groups: res, errors: errors };
    },
    async getGroup(groupId) {
        const result = await this.getGroups([groupId]);
        if (result.errors[0]) {
            throw result.errors[0];
        }
        const group = result.groups;
        return group[0] ? group[0] : null;
    },
    async getGroupBySlug(groupSlug) {
        const groupObj = await Group.findOne({ slug: groupSlug });
        const result = await this.getGroups([groupObj.id]);
        if (result.errors[0]) {
            throw result.errors[0];
        }
        const group = result.groups;
        return group[0] ? group[0] : null;
    },
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
