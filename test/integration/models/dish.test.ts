import { GroupModifier } from "../../../interfaces/Modifier";
import  dishGenerator   from "../../generators/dish.generator";
import { expect } from "chai";
 
describe('Dish', function () {
  it('Test DishGenerator', async () => {
    for (let index = 0; index < 3; index++) {
      try {
        var result =  dishGenerator({name: "test", price: 100.1});
      } catch (error) {

      }
    }
    //expect(result['InitPaymentAdapter'].adapter).to.equal("test-payment-system");
  });

  it('Dish Model attributes', async () => {
    let dish = (await Dish.find({}).limit(1).populate("images"))[0];
    expect(dish).to.include.all.keys(
    'id',
    'rmsId',
    'additionalInfo',
    'code',
    'name',
    'seoDescription',
    'seoKeywords',
    'seoText',
    'seoTitle',
    'carbohydrateAmount',
    'carbohydrateFullAmount',
    'energyAmount',
    'energyFullAmount',
    'fatAmount',
    'fatFullAmount',
    'fiberAmount',
    'fiberFullAmount',
    'groupId',
    'measureUnit',
    'price',
    'productCategoryId',
    'type',
    'weight',
    'sortOrder',
    'isDeleted',
    'isModificable',
    'modifiers',
    'parentGroup',
    'tags',
    'balance',
    'images',
    'slug',
    'hash',
    'description',
    'visible',
    'modifier',
    'promo',
    'worktime',
    'concept',
    'ingredients',
    'updatedAt',
    'createdAt'

    )
  });

  it('getDishes', function(){
    // it's planned implement after connect @webresto/worktime
    expect(Dish.getDishes).to.not.equals(undefined);
  });
  it('getDishModifiers', async function(){
    expect(Dish.getDishModifiers).to.not.equals(undefined);

    let dishes = await Dish.find({});

    let group = (await Group.find({}).limit(1))[0];

    let modifiers: GroupModifier[]  = [
      {
        modifierId: group.id, 
        childModifiers: [
          { id: dishes[0].id, modifierId: dishes[0].id, rmsId: dishes[0].rmsId }], 
          groupId: group.id,
        id: "",
        rmsId: ""
      }
    ];

    let dish = await Dish.createOrUpdate( dishGenerator({name: "test dish modifiers", modifiers: modifiers, price: 100.1 }) );
    dish = await Dish.getDishModifiers(dish);

    if(typeof dish.modifiers[0].group === "string" || typeof dish.modifiers[0].childModifiers[0].dish === "string") throw `Bad type`
    expect(dish.modifiers.length).to.equal(1);
    expect(dish.modifiers[0].childModifiers[0].dish.id).to.equal(dishes[0].id);
    expect(dish.modifiers[0].group.id).to.equal(group.id);

  });
  it('createOrUpdate', async function(){
    expect(Dish.createOrUpdate).to.not.equals(undefined);

    let dish = await Dish.createOrUpdate(dishGenerator({name: "test dish", price: 100.1}));

    dish.name = 'New Dish Name';
    dish.price = 100.1;
    let updatedDish = await Dish.createOrUpdate(dish);

    expect(updatedDish.name).to.equals('New Dish Name');
    expect(updatedDish.id).to.equal(dish.id);

    let d = dishGenerator();
    let dish1 = await Dish.createOrUpdate(d);
    await delay(1000);
    let dish2 = await Dish.createOrUpdate(d);
    expect(dish1.hash).to.equal(dish2.hash);

  });
});

function delay(ms: number){
  return new Promise((resolve, reject) => {
      setTimeout(resolve, ms)
  });
}
