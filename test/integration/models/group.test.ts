import { expect } from "chai";
import groupGenerator from "../../generators/group.generator";
import { groupFields } from "../../generators/group.generator";
import dishGenerator from "../../generators/dish.generator";
import { dishFields } from "../../generators/dish.generator";
import Group from "../../../models/Group";
import { isArray } from "lodash";

describe('Group', function(){
  let exampleGroups: Group[] = [];
  it('create example Groups', async function(){
    for(let i = 0; i < 3; i++){
      // @ts-ignore
      exampleGroups.push(groupGenerator());
      let [lastGroup] = exampleGroups.slice(-1);
      // @ts-ignore
      lastGroup.dishes = [dishGenerator(), dishGenerator()];
      lastGroup.childGroups = [];
      for(let x = 0; x < 2; x++){        
        let newGroup = groupGenerator();
        newGroup.dishes = [dishGenerator(), dishGenerator()];
        // @ts-ignore
        lastGroup.childGroups.push(newGroup);
      }
    }
    await Group.create(exampleGroups);
  });
  it('getGroups', async function(){
    // let groups = await Group.find({});
    let result = await Group.getGroups([exampleGroups[0].id, exampleGroups[1].id, exampleGroups[2].id]);

    // @ts-ignore
    expect(result.groups.length).to.equal(3);
   
    await compareGroups(exampleGroups, result.groups);
    
  });
  it('getGroup', async function(){
    let group = await Group.getGroup(exampleGroups[0].id);
    await compareGroup(exampleGroups[0], group);

    group = await Group.getGroup('bad-id-group');
    expect(group).to.equal(null);
  });
  it('getGroupBySlug', async function(){
    let example = await Group.getGroup(exampleGroups[1].id);
    let group = await Group.getGroupBySlug(example.slug);

    // expect(example).to.equal(group);
    await compareGroup(example, group);

    let error = null;
    try{
      group = await Group.getGroupBySlug('not-existing-slug');
    }catch(e){
      error = e;
    }
    expect(error).to.not.equal(null);
  });
  it('createOrUpdate', async function(){
    let group = await Group.findOne(exampleGroups[0].id);
    group.name = 'New Group Name';
    let updatedGroup = await Group.createOrUpdate(group);

    expect(updatedGroup.name).to.equal('New Group Name');
    expect(updatedGroup.id).to.equal(group.id);
  });

  function compareGroups(exampleGroups: Group[], result): void{
    for(let exampleGroup of exampleGroups){
      // @ts-ignore
      let group = result.find(g => g.id === exampleGroup.id);
             
      expect(group).to.be.an('object');
  
      compareGroup(exampleGroup, group);
      
      // compareDishes(exampleGroup.dishes, group.dishesList);
      // console.log(group);

      if(exampleGroup.childGroups && exampleGroup.childGroups.length){
        expect(exampleGroup.childGroups.length).to.equal(group.children.length);
        compareGroups(exampleGroup.childGroups, group.children);
      }
    }
  }
  function compareGroup(exampleGroup: Group, group): void{
    let keys = Object.keys(exampleGroup);
    const testGroupFields = groupFields;
    for(let key of keys){
      if(!testGroupFields.includes(key)){
        continue;
      }
      // console.log(key);
      // console.log(key, exampleGroup[key], group[key]);
      if(isArray(exampleGroup[key])){
        expect(exampleGroup[key].length).to.equal(group[key].length);
      }else{          
        expect(exampleGroup[key]).to.equal(group[key]);
      }
    }
    if(exampleGroup.dishes && exampleGroup.dishes.length){
      compareDishes(exampleGroup.dishes, group.dishes);
    }
    // compareDishes(exampleGroup.dishes, group.dishesList);
  }
  function compareDishes(exampleDishes, dishes){    
    const testDishFields = dishFields;
    for(let exampleDish of exampleDishes){
      let dish = dishes.find(d => d.id === exampleDish.id);
      expect(dish).to.be.an('object');
      let keys = Object.keys(exampleDish);
      for(let key of keys){
        if(!testDishFields.includes(key)){
          continue;
        }
        // console.log(key, exampleDish[key], dish[key]);
        if(isArray(exampleDish[key])){
          expect(exampleDish[key].length).to.equal(dish[key].length);
        }else{
          expect(exampleDish[key]).to.equal(dish[key]);
        }
      }
    }
  }
});