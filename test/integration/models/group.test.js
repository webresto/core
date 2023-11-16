"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const chai_1 = require("chai");
const group_generator_1 = __importDefault(require("../../generators/group.generator"));
const group_generator_2 = require("../../generators/group.generator");
const dish_generator_1 = require("../../generators/dish.generator");
const lodash_1 = require("lodash");
describe("Group", function () {
    let exampleGroups = [];
    it("create example Groups", async function () {
        try {
            for (let i = 0; i < 3; i++) {
                const group = (0, group_generator_1.default)();
                exampleGroups.push(group);
                await Group.create(group).fetch();
                let [lastGroup] = exampleGroups.slice(-1);
                //lastGroup.dishes = [dishGenerator(), dishGenerator()];
                lastGroup.childGroups = [];
                for (let x = 0; x < 2; x++) {
                    let newGroup = (0, group_generator_1.default)();
                    //newGroup.dishes = [dishGenerator(), dishGenerator()];
                    lastGroup.childGroups.push(newGroup.id);
                }
            }
        }
        catch (error) {
            // throw error
        }
    });
    /**
     *  deprecated, please read todo at the end of this file
    it("getGroups", async function () {
      // let groups = await Group.find({});
      let result = await Group.getGroups([exampleGroups[0].id, exampleGroups[1].id, exampleGroups[2].id]);
      expect(result.groups.length).to.equal(3);
      await equalGroups(exampleGroups, result.groups);
    });
     */
    it("getGroup", async function () {
        let group = await Group.getGroup(exampleGroups[0].id);
        await equalGroup(exampleGroups[0], group);
        group = await Group.getGroup("bad-id-group");
        (0, chai_1.expect)(group).to.equal(null);
    });
    it("getGroupBySlug", async function () {
        let example = await Group.getGroup(exampleGroups[1].id);
        let group = await Group.getGroupBySlug(example.slug);
        // expect(example).to.equal(group);
        await equalGroup(example, group);
        let error = null;
        try {
            group = await Group.getGroupBySlug("not-existing-slug");
        }
        catch (e) {
            error = e;
        }
        (0, chai_1.expect)(error).to.not.equal(null);
    });
    it("createOrUpdate", async function () {
        let group = await Group.findOne({ id: exampleGroups[0].id });
        group.name = "New Group Name";
        let updatedGroup = await Group.createOrUpdate(group);
        (0, chai_1.expect)(updatedGroup.name).to.equal("New Group Name");
        (0, chai_1.expect)(updatedGroup.id).to.equal(group.id);
    });
    //// Local methods /////////////////////////////
    /** Throw if not equal */
    function equalGroups(exampleGroups, result) {
        for (let exampleGroup of exampleGroups) {
            let group = result.find((g) => {
                return g.id === exampleGroup.id;
            });
            if (!group)
                throw "equalGroups not found any group in results";
            if (typeof group !== "object")
                throw "group is not object";
            if (exampleGroup.childGroups && exampleGroup.childGroups.length) {
                (0, chai_1.expect)(exampleGroup.childGroups.length).to.equal(group.childGroups.length);
                equalGroups(exampleGroup.childGroups, group.childGroups);
            }
        }
    }
    /** Throw if not equal */
    function equalGroup(exampleGroup, group) {
        let keys = Object.keys(exampleGroup);
        const testGroupFields = group_generator_2.groupFields;
        for (let key of keys) {
            if (!testGroupFields.includes(key)) {
                continue;
            }
            if ((0, lodash_1.isArray)(exampleGroup[key])) {
                (0, chai_1.expect)(exampleGroup[key].length).to.equal(group[key].length);
            }
            else {
                (0, chai_1.expect)(exampleGroup[key]).to.equal(group[key]);
            }
        }
        if (exampleGroup.dishes && exampleGroup.dishes.length) {
            equalDishes(exampleGroup.dishes, group.dishes);
        }
    }
    /** Throw if not equal */
    function equalDishes(exampleDishes, dishes) {
        const testDishFields = dish_generator_1.dishFields;
        for (let exampleDish of exampleDishes) {
            let dish = dishes.find((d) => d.id === exampleDish.id);
            (0, chai_1.expect)(dish).to.be.an("object");
            let keys = Object.keys(exampleDish);
            for (let key of keys) {
                if (!testDishFields.includes(key)) {
                    continue;
                }
                if ((0, lodash_1.isArray)(exampleDish[key])) {
                    (0, chai_1.expect)(exampleDish[key].length).to.equal(dish[key].length);
                }
                else {
                    (0, chai_1.expect)(exampleDish[key]).to.equal(dish[key]);
                }
            }
        }
    }
});
// todo: 1. Add new methods for GroupModel and delete deprecate
