"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const group_generator_1 = require("../../generators/group.generator");
const dish_generator_1 = require("../../generators/dish.generator");
const lodash_1 = require("lodash");
describe('Group', function () {
    let exampleGroups = [];
    it('create example Groups', async function () {
        for (let i = 0; i < 3; i++) {
            // @ts-ignore
            exampleGroups.push(group_generator_1.default());
            let [lastGroup] = exampleGroups.slice(-1);
            // @ts-ignore
            lastGroup.dishes = [dish_generator_1.default(), dish_generator_1.default()];
            lastGroup.childGroups = [];
            for (let x = 0; x < 2; x++) {
                let newGroup = group_generator_1.default();
                newGroup.dishes = [dish_generator_1.default(), dish_generator_1.default()];
                // @ts-ignore
                lastGroup.childGroups.push(newGroup);
            }
        }
        await Group.create(exampleGroups);
    });
    it('getGroups', async function () {
        // let groups = await Group.find({});
        let result = await Group.getGroups([exampleGroups[0].id, exampleGroups[1].id, exampleGroups[2].id]);
        // @ts-ignore
        chai_1.expect(result.groups.length).to.equal(3);
        await compareGroups(exampleGroups, result.groups);
    });
    it('getGroup', async function () {
        let group = await Group.getGroup(exampleGroups[0].id);
        await compareGroup(exampleGroups[0], group);
        group = await Group.getGroup('bad-id-group');
        chai_1.expect(group).to.equal(null);
    });
    it('getGroupBySlug', async function () {
        let example = await Group.getGroup(exampleGroups[1].id);
        let group = await Group.getGroupBySlug(example.slug);
        // expect(example).to.equal(group);
        await compareGroup(example, group);
        let error = null;
        try {
            group = await Group.getGroupBySlug('not-existing-slug');
        }
        catch (e) {
            error = e;
        }
        chai_1.expect(error).to.not.equal(null);
    });
    it('createOrUpdate', async function () {
        let group = await Group.findOne(exampleGroups[0].id);
        group.name = 'New Group Name';
        let updatedGroup = await Group.createOrUpdate(group);
        chai_1.expect(updatedGroup.name).to.equal('New Group Name');
        chai_1.expect(updatedGroup.id).to.equal(group.id);
    });
    function compareGroups(exampleGroups, result) {
        for (let exampleGroup of exampleGroups) {
            // @ts-ignore
            let group = result.find(g => g.id === exampleGroup.id);
            chai_1.expect(group).to.be.an('object');
            compareGroup(exampleGroup, group);
            // compareDishes(exampleGroup.dishes, group.dishesList);
            // console.log(group);
            if (exampleGroup.childGroups && exampleGroup.childGroups.length) {
                chai_1.expect(exampleGroup.childGroups.length).to.equal(group.children.length);
                compareGroups(exampleGroup.childGroups, group.children);
            }
        }
    }
    function compareGroup(exampleGroup, group) {
        let keys = Object.keys(exampleGroup);
        const testGroupFields = [
            'id',
            'additionalInfo',
            'code',
            'description',
            'order',
            'images',
            'name',
            'tags',
            'isDeleted',
            'dishesTags',
            'isIncludedInMenu',
            'dishes',
        ];
        for (let key of keys) {
            if (!testGroupFields.includes(key)) {
                continue;
            }
            // console.log(key);
            // console.log(key, exampleGroup[key], group[key]);
            if (lodash_1.isArray(exampleGroup[key])) {
                chai_1.expect(exampleGroup[key].length).to.equal(group[key].length);
            }
            else {
                chai_1.expect(exampleGroup[key]).to.equal(group[key]);
            }
        }
        if (exampleGroup.dishes && exampleGroup.dishes.length) {
            compareDishes(exampleGroup.dishes, group.dishes);
        }
        // compareDishes(exampleGroup.dishes, group.dishesList);
    }
    function compareDishes(exampleDishes, dishes) {
        const testDishFields = [
            'id',
            'additionalInfo',
            'balance',
            'modifiers',
            'weight',
            'price',
            'order',
            'images',
            'name',
            'composition',
            'rmsId',
            'code',
            'tags',
            'isDeleted'
        ];
        for (let exampleDish of exampleDishes) {
            let dish = dishes.find(d => d.id === exampleDish.id);
            chai_1.expect(dish).to.be.an('object');
            let keys = Object.keys(exampleDish);
            for (let key of keys) {
                if (!testDishFields.includes(key)) {
                    continue;
                }
                // console.log(key, exampleDish[key], dish[key]);
                if (lodash_1.isArray(exampleDish[key])) {
                    chai_1.expect(exampleDish[key].length).to.equal(dish[key].length);
                }
                else {
                    chai_1.expect(exampleDish[key]).to.equal(dish[key]);
                }
            }
        }
    }
});
