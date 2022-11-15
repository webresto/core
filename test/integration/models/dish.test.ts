import  dishGenerator   from "../../generators/dish.generator";
import { expect } from "chai";

const dishExample = {
    "images": [
      {
        "id": "9e283567-3e6e-4da9-8944-0b91ec6fb646",
        "images": {
          "origin": "/images/72fe193c-ed34-4ee2-89e1-f22cb7f99e0d.png",
          "small": "/images/27ed4b5b-7161-4d88-bf76-fae8023aff9f.png",
          "large": "/images/9399fd28-e03a-4f86-8078-a37c67d08c94.png"
        },
        "uploadDate": "2020-10-13 16:23:20",
        "createdAt": "2020-10-16T02:11:45.000Z",
        "updatedAt": "2020-10-16T02:11:45.000Z",
        "group": null
      }
    ],
    "parentGroup": {
      "id": "582fc73f-ebb7-4153-8923-d1fd4a772e96",
      "additionalInfo": null,
      "code": null,
      "description": null,
      "isDeleted": false,
      "name": "Пицца",
      "seoDescription": null,
      "seoKeywords": null,
      "seoText": null,
      "seoTitle": null,
      "tags": [],
      "order": 3,
      "dishesTags": null,
      "slug": "picca",
      "visible": null,
      "modifier": null,
      "promo": null,
      "workTime": null,
      "createdAt": "2020-10-16T02:11:44.000Z",
      "updatedAt": "2020-10-16T02:11:44.000Z",
      "parentGroup": null
    },
    "id": "9995136e-f5c9-5d09-92ce-f65a0554342d",
    "rmsId": "38dee846-ee54-418c-ab4e-1bc1e8b3ae6d",
    "additionalInfo": null,
    "code": "00465",
    "description": "880гр  32см  ветчина, томаты, маслины, маринованные огурчики, томатный соус, сыр моцарелла",
    "name": "Европейская",
    "seoDescription": null,
    "seoKeywords": null,
    "seoText": null,
    "seoTitle": null,
    "carbohydrateAmount": 0,
    "carbohydrateFullAmount": 0,
    "doNotPrintInCheque": false,
    "energyAmount": 0,
    "energyFullAmount": 0,
    "fatAmount": 0,
    "fatFullAmount": 0,
    "fiberAmount": 0,
    "fiberFullAmount": 0,
    "groupId": null,
    "measureUnit": "порц",
    "price": 749,
    "productCategoryId": "1483c868-aaf7-6a9b-0165-a31381241120",
    "type": "dish",
    "weight": 0.92,
    "order": 10,
    "isDeleted": false,
    "modifiers": [],
    "tags": [],
    "balance": -1,
    "slug": "evropejskaya",
    "hash": -374730368,
    "composition": null,
    "visible": null,
    "modifier": null,
    "promo": null,
    "workTime": null
} 

describe('Dish', function () {
  it('Test DishGenerator', async () => {
    for (let index = 0; index < 3; index++) {
      try {
        var result =  dishGenerator({name: "test"});
      } catch (error) {
    
      }
    } 
    //expect(result['InitPaymentAdapter'].adapter).to.equal("test-payment-system");
  });
  
  it('Dish Model attributes', async () => {
    let dish = (await Dish.find({}).limit(1).populate('images'))[0];
    expect(dish).to.include.all.keys(
    'id',
    'rmsId',
    'additionalInfo',
    'code',
    'description',
    'name',
    'seoDescription',
    'seoKeywords',
    'seoText',
    'seoTitle',
    'carbohydrateAmount',
    'carbohydrateFullAmount',
    'doNotPrintInCheque',
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
    'order',
    'isDeleted',
    'isModificable',
    'modifiers',
    'parentGroup',
    'tags',
    'balance',
    'images',
    'slug',
    'hash',
    'composition',
    'visible',
    'modifier',
    'promo',
    'workTime')
  });

  it('getDishes', function(){
    // it's planned implement after connect @webresto/worktime
    expect(Dish.getDishes).to.not.equals(undefined);
  });
  it('getDishModifiers', async function(){
    expect(Dish.getDishModifiers).to.not.equals(undefined);

    let dishes = await Dish.find({});

    let group = (await Group.find({}).limit(1))[0];
    
    let modifiers = [{modifierId: group.id, childModifiers: [{id: dishes[0].id, modifierId: dishes[0].id}]}];
    // @ts-ignore
    let dish = await Dish.createOrUpdate( dishGenerator({name: "test dish modifiers", modifiers: modifiers }) );
    await Dish.getDishModifiers(dish);
    // console.log(JSON.stringify(dish, null, '  '));
    expect(dish.modifiers.length).to.equal(1);
    expect(dish.modifiers[0].childModifiers[0].dish.id).to.equal(dishes[0].id);
    expect(dish.modifiers[0].group.id).to.equal(group.id);
    
  });
  it('createOrUpdate', async function(){
    expect(Dish.createOrUpdate).to.not.equals(undefined);
    // @ts-ignore
    let dish = await Dish.createOrUpdate(dishGenerator({name: "test dish"}));

    dish.name = 'New Dish Name';
    dish.price = 100.1;
    let updatedDish = await Dish.createOrUpdate(dish);

    expect(updatedDish.name).to.equals('New Dish Name');
    expect(updatedDish.id).to.equal(dish.id);

    let d = dishGenerator();
    // @ts-ignore
    let dish1 = await Dish.createOrUpdate(d);
    await delay(1000);
    // @ts-ignore
    let dish2 = await Dish.createOrUpdate(d);
    // @ts-ignore
    expect(dish1.hash).to.equal(dish2.hash);
 
  });
});

function delay(ms){
  return new Promise((resolve, reject) => {
      setTimeout(resolve, ms)
  });
}
