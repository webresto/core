import { expect } from "chai";
import groupGenerator from "../../generators/group.generator";
import { groupFields } from "../../generators/group.generator";
import dishGenerator from "../../generators/dish.generator";
import { dishFields } from "../../generators/dish.generator";
import Group from "../../../models/Group";
import { isArray } from "lodash";

describe("Group", function () {
  let exampleGroups: Group[] = [];

  it("create example Groups", async function () {
    try {
      for (let i = 0; i < 3; i++) {
        const group = groupGenerator()    
        exampleGroups.push(group);
        await Group.create(group).fetch();

        let [lastGroup] = exampleGroups.slice(-1);
        
        //lastGroup.dishes = [dishGenerator(), dishGenerator()];
        lastGroup.childGroups = [];
        for (let x = 0; x < 2; x++) {
          let newGroup = groupGenerator();
          //newGroup.dishes = [dishGenerator(), dishGenerator()];
          
          lastGroup.childGroups.push(newGroup.id);
        }
      }
    } catch (error) {
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
    expect(group).to.equal(null);
  });

  it("getGroupBySlug", async function () {
    let example = await Group.getGroup(exampleGroups[1].id);
    let group = await Group.getGroupBySlug(example.slug);

    // expect(example).to.equal(group);
    await equalGroup(example, group);

    let error = null;
    try {
      group = await Group.getGroupBySlug("not-existing-slug");
    } catch (e) {
      error = e;
    }
    expect(error).to.not.equal(null);
  });

  it("createOrUpdate", async function () {
    let group = await Group.findOne({id: exampleGroups[0].id});
    group.name = "New Group Name";
    let updatedGroup = await Group.createOrUpdate(group);

    expect(updatedGroup.name).to.equal("New Group Name");
    expect(updatedGroup.id).to.equal(group.id);
  });

  //// Local methods /////////////////////////////

  /** Throw if not equal */
  function equalGroups(exampleGroups: Group[], result: Group[]): void {
    for (let exampleGroup of exampleGroups) {
      
      let group = result.find((g) => {
        return g.id === exampleGroup.id;
      });

      if (!group) throw "equalGroups not found any group in results";
      if (typeof group !== "object") throw "group is not object";

      
      if (exampleGroup.childGroups && exampleGroup.childGroups.length) {
        expect(exampleGroup.childGroups.length).to.equal(group.childGroups.length);
        equalGroups(exampleGroup.childGroups as Group[], group.childGroups as Group[]);
      }
    }
  }

  /** Throw if not equal */
  function equalGroup(exampleGroup: Group, group: Group): void {
    let keys = Object.keys(exampleGroup);
    const testGroupFields = groupFields;
    for (let key of keys) {
      if (!testGroupFields.includes(key)) {
        continue;
      }
      if (isArray(exampleGroup[key])) {
        expect(exampleGroup[key].length).to.equal(group[key].length);
      } else {
        expect(exampleGroup[key]).to.equal(group[key]);
      }
    }
    if (exampleGroup.dishes && exampleGroup.dishes.length) {
      equalDishes(exampleGroup.dishes, group.dishes);
    }
  }

  /** Throw if not equal */
  function equalDishes(exampleDishes, dishes) {
    const testDishFields = dishFields;
    for (let exampleDish of exampleDishes) {
      let dish = dishes.find((d) => d.id === exampleDish.id);
      expect(dish).to.be.an("object");
      let keys = Object.keys(exampleDish);
      for (let key of keys) {
        if (!testDishFields.includes(key)) {
          continue;
        }
        if (isArray(exampleDish[key])) {
          expect(exampleDish[key].length).to.equal(dish[key].length);
        } else {
          expect(exampleDish[key]).to.equal(dish[key]);
        }
      }
    }
  }
});


// todo: 1. Add new methods for GroupModel and delete deprecate