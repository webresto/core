import dishGenerator from '../../generators/dish.generator';
import { expect } from 'chai';

// import AbstractPromotionHandler from '@webresto/core/adapters/discount/AbstractPromotion';
import { InMemoryDiscountAdapter } from '../../mocks/adapter/discount';
import discountGenerator from '../../generators/discount.generator';
import groupGenerator from '../../generators/group.generator';
import AbstractPromotionHandler from '../../../adapters/promotion/AbstractPromotion';
import findModelInstanceByAttributes from './../../../libs/findModelInstance';
import { Adapter } from './../../../adapters/index';
import AbstractPromotionAdapter from '../../../adapters/promotion/AbstractPromotionAdapter';
import Group from './../../../models/Group';
import Dish from './../../../models/Dish';
import Order, { PromotionState } from './../../../models/Order';
import { stringsInArray } from '../../../libs/stringsInArray';
import ConfiguredPromotion from '../../../adapters/promotion/default/configuredPromotion';
import Decimal from 'decimal.js';

describe('Discount', function () {
   
   // TODO: tests throw get adapter
   
    // let order: Order;
    // let dishes: Dish[];
    // let fullOrder: Order;
    after(async function() {
      await Promotion.destroy({})
    })

    let discInMemory = new InMemoryDiscountAdapter
  
    let discountEx:AbstractPromotionHandler =  {
        id: "1-id",
        configDiscount: {
            discountType: "flat",
            discountAmount: 1.33,
            dishes: ["a"],
            groups: ["a"],
            excludeModifiers: true
          },
        name: "1-name",
        description: "string",
        concept: ["origin","clear","Happy Birthday","3dif"],
        condition: (arg: Group | Dish | Order): boolean =>{
          if (findModelInstanceByAttributes(arg) === "Order" && stringsInArray(arg.concept, discountEx.concept) ) {
            // Order.populate()
            //discountEx.concept.includes(arg.concept)
            return true;
        }
        
        if (findModelInstanceByAttributes(arg) === "Dish" && stringsInArray(arg.concept, discountEx.concept)) {
            // TODO: check if includes in IconfigDish
            return true;
        }
        
        if (findModelInstanceByAttributes(arg) === "Group" && stringsInArray(arg.concept, discountEx.concept) ) {
             // TODO: check if includes in IconfigG
            return true;
        }
        
        return false
      },
        action: async (order: Order): Promise<PromotionState> => {
            // console.log("ACTION ================awdawdawd")
             return await configuredPromotion.applyPromotion(order.id) 
        },
        isPublic: true,
        isJoint: true,
        // sortOrder: 0,
        displayGroup:  function (group:Group, user?: string): Group {
          if (this.isJoint === true && this.isPublic === true) {
          
            group.discountAmount = Adapter.getPromotionAdapter().promotions[this.id].configDiscount.discountAmount;
            group.discountType = Adapter.getPromotionAdapter().promotions[this.id].configDiscount.discountType;
           }
           
          return group
        },
        displayDish: function (dish:Dish, user?: string): Dish {
          if (this.isJoint === true && this.isPublic === true) {
            // 
            dish.discountAmount = Adapter.getPromotionAdapter().promotions[this.id].configDiscount.discountAmount;
            dish.discountType = Adapter.getPromotionAdapter().promotions[this.id].configDiscount.discountType;
            dish.oldPrice = dish.price
  
            dish.price = this.configDiscount.discountType === "flat" 
            ? new Decimal(dish.price).minus(+this.configDiscount.discountAmount).toNumber()
            : new Decimal(dish.price)
                .mul(+this.configDiscount.discountAmount / 100)
                .toNumber()  
          }
          return dish
        },
        externalId: "1-externalId",
    }

    let configuredPromotion: ConfiguredPromotion
    let configuredPromotionFromMemory: ConfiguredPromotion
    let groupsId = []


    let disc1:AbstractPromotionHandler = discountGenerator({
      concept: ["origin","3dif"],
      id: 'aa2-id',
      isJoint: true,
      name: 'awdawd',
      isPublic: true,
      configDiscount: {
        discountType: "flat",
        discountAmount: 1,
        dishes: ["Aaa"],
        groups: [],
        excludeModifiers: true
      },
    })
    
    before(async () =>{
      configuredPromotion = new ConfiguredPromotion(discountEx, discountEx.configDiscount)
      configuredPromotionFromMemory = new ConfiguredPromotion(discInMemory, discInMemory.configDiscount)
      const groups = await Group.find({})
      groupsId = groups.map(group => group.id)
      discountEx.configDiscount.groups = groupsId
      discInMemory.configDiscount.groups = groupsId
      disc1.configDiscount.groups = groupsId
   })  
    
      it("discount add ", async function () {
        // let a = await Adapter.getDiscountAdapter()
        await Adapter.getPromotionAdapter().addPromotionHandler(discountEx)

        let discount = await Promotion.find({});
        let discountById = await Adapter.getPromotionAdapter().getPromotionHandlerById(discountEx.id)

        expect(discount[0]).to.be.an("object");
        expect(discountById).to.be.an("object");
      });


      it("discount applyPromotion flat on order", async function () {
        let discountAdapter = Adapter.getPromotionAdapter()
        let order = await Order.create({id: "add-dish-with-discount"}).fetch();
        await Order.updateOne({id: order.id}, {concept: "origin",user: "user"});

        let dish1 = await Dish.createOrUpdate(dishGenerator({name: "test dish", price: 10, concept: "origin",parentGroup:groupsId[0]}));
        discountEx.configDiscount.dishes.push(dish1.id)
        await discountAdapter.addPromotionHandler(discountEx)

        await Order.addDish({id: order.id}, dish1, 5, [], "", "test");

        await Adapter.getPromotionAdapter().clearOfPromotion(order.id)
        await configuredPromotion.applyPromotion(order.id)

        let result = await Order.findOne(order.id) 
        expect(result.discountTotal).to.equal(6.65);
      });


      it("discount applyPromotion flat on order with different dishes", async function () {
        let discountAdapter:AbstractPromotionAdapter = Adapter.getPromotionAdapter()
        let order = await Order.create({id: "add-dish-with-discounts"}).fetch();
        await Order.updateOne({id: order.id}, {concept: "origin",user: "user"});

        let dish1 = await Dish.createOrUpdate(dishGenerator({name: "test dish", price: 10.1, concept: "origin",parentGroup:groupsId[0]}));
        let dish2 = await Dish.createOrUpdate(dishGenerator({name: "test fish", price: 15.2, concept: "origin",parentGroup:groupsId[0]}));
        
        discountEx.configDiscount.dishes.push(dish1.id)
        discountEx.configDiscount.dishes.push(dish2.id)
        await discountAdapter.addPromotionHandler(discountEx)

        await Order.addDish({id: order.id}, dish1, 5, [], "", "test");
        await Order.addDish({id: order.id}, dish2, 4, [], "", "test");

        // let result1 = await Dish.findOne(dish1.id)
        await Adapter.getPromotionAdapter().clearOfPromotion(order.id)
        await configuredPromotion.applyPromotion(order.id)

        let result = await Order.findOne(order.id) 
        expect(result.discountTotal).to.equal(11.97);
      });

      it("discount Adapter.getPromotionAdapter()-applyToOrder on order with different dishes", async function () {
        let discountAdapter:AbstractPromotionAdapter = Adapter.getPromotionAdapter()
        let order = await Order.create({id: "apply-to-ordersa"}).fetch();
        await Order.updateOne({id: order.id}, {concept: "origin",user: "user"});

        //Decimal check 15.2,  10.1
        let dish1 = await Dish.createOrUpdate(dishGenerator({name: "test disha", price: 10.1, concept: "clear",parentGroup:groupsId[0]}));
        let dish2 = await Dish.createOrUpdate(dishGenerator({name: "test fisha", price: 15.2, concept: "clear",parentGroup:groupsId[0]}));
        discountEx.configDiscount.dishes.push(dish1.id)
        discountEx.configDiscount.dishes.push(dish2.id)

        await discountAdapter.addPromotionHandler(discountEx)

        await Order.addDish({id: order.id}, dish1, 5, [], "", "testa");
        await Order.addDish({id: order.id}, dish2, 4, [], "", "testa");


        order = await Order.findOne(order.id)

        await discountAdapter.processOrder(order)

        let result = await Order.findOne(order.id) //.populate("dishes");

        // console.log(result)
        // console.log(result, "get discount order")
        expect(result.discountTotal).to.equal(11.97);

        let dish3 = await Dish.createOrUpdate(dishGenerator({name: "test disha", price: 10, concept: "a",parentGroup:groupsId[0]}));
        let dish4 = await Dish.createOrUpdate(dishGenerator({name: "test fisha", price: 15, concept: "a",parentGroup:groupsId[0]}));
        await Order.addDish({id: order.id}, dish3, 5, [], "", "test");
        await Order.addDish({id: order.id}, dish4, 4, [], "", "test");

        order = await Order.findOne(order.id)

        // console.log(order)

        await discountAdapter.processOrder(order)

        result = await Order.findOne(order.id) 

        expect(result.discountTotal).to.equal(11.97);

      });

            

      it("discount applyPromotion percentage on order with different dishes", async function () {
        let discountAdapter:AbstractPromotionAdapter = Adapter.getPromotionAdapter()
        let order = await Order.create({id: "add-dish-with-discountsa"}).fetch();
        await Order.updateOne({id: order.id}, {concept: "origin",user: "user"});

        let dish1 = await Dish.createOrUpdate(dishGenerator({name: "test dish", price: 10.1, concept: "origin",parentGroup:groupsId[0]}));
        let dish2 = await Dish.createOrUpdate(dishGenerator({name: "test fish", price: 15.2, concept: "origin",parentGroup:groupsId[0]}));
        
        discInMemory.configDiscount.dishes.push(dish1.id)
        discInMemory.configDiscount.dishes.push(dish2.id)

        await discountAdapter.addPromotionHandler(discInMemory)

        await Order.addDish({id: order.id}, dish1, 5, [], "", "test");
        await Order.addDish({id: order.id}, dish2, 4, [], "", "test");
        // console.log(discInMemory)

        // let result1 = await Dish.findOne(dish1.id)

        // DiscountAdapter.applyToOrder(order)
        await Adapter.getPromotionAdapter().clearOfPromotion(order.id)
        await configuredPromotionFromMemory.applyPromotion(order.id)

        let result = await Order.findOne(order.id) //.populate("dishes");
        // console.log(result, "get discount order")
        expect(result.discountTotal).to.equal(11.13);
      });
      
      it("discount test dishes with flat and percentage types of discounts but same concept", async function () {
        let discountAdapter:AbstractPromotionAdapter = Adapter.getPromotionAdapter()
        let order = await Order.create({id: "test-discounts-on-different-types"}).fetch();
        await Order.updateOne({id: order.id}, {concept: "origin",user: "user"});

        let dish1 = await Dish.createOrUpdate(dishGenerator({name: "test dish", price: 10.1, concept: "Happy Birthday",parentGroup:groupsId[0]}));
        let dish2 = await Dish.createOrUpdate(dishGenerator({name: "test fish", price: 15.2, concept: "Happy Birthday",parentGroup:groupsId[0]}));
        let dish3 = await Dish.createOrUpdate(dishGenerator({name: "test disha", price: 10.1, concept: "Happy Birthday",parentGroup:groupsId[0]}));
        let dish4 = await Dish.createOrUpdate(dishGenerator({name: "test fisha", price: 15.2, concept: "Happy Birthday",parentGroup:groupsId[0]}));
        let dish5 = await Dish.createOrUpdate(dishGenerator({name: "test fishw", price: 15.2, concept: "Happy Birthday",parentGroup:groupsId[0]}));
        
        let dishes = await Dish.find({})
        const dishesId = dishes.map(dish => dish.id)

        discInMemory.configDiscount.dishes = dishesId

        discountEx.configDiscount.dishes = dishesId


        await discountAdapter.addPromotionHandler(discInMemory)
        await discountAdapter.addPromotionHandler(discountEx)

        await Order.addDish({id: order.id}, dish1, 5, [], "", "testa2");
        await Order.addDish({id: order.id}, dish2, 4, [], "", "tes");
        await Order.addDish({id: order.id}, dish3, 5, [], "", "testa");
        await Order.addDish({id: order.id}, dish4, 4, [], "", "test");
        await Order.addDish({id: order.id}, dish5, 5, [], "", "testa1");

        // 29.86 + 30.59 = 60.45
        
        order = await Order.findOne(order.id)
        await discountAdapter.processOrder(order)
        
        let result = await Order.findOne(order.id)
        // console.log(result, "get discount order")
        expect(result.discountTotal).to.equal(60.45);
      });
      
      it("discount test dishes with flat and percentage types of discounts but different concept", async function () {
        let discountAdapter:AbstractPromotionAdapter = Adapter.getPromotionAdapter()
        let order = await Order.create({id: "test-different-types-and-concept"}).fetch();
        await Order.updateOne({id: order.id}, {concept: "origin",user: "user"});

        let dish1 = await Dish.createOrUpdate(dishGenerator({name: "test dish", price: 10.1, concept: "Happy Birthday",parentGroup:groupsId[0]}));
        let dish2 = await Dish.createOrUpdate(dishGenerator({name: "test fish", price: 15.2, concept: "NewYear",parentGroup:groupsId[0]}));
        let dish3 = await Dish.createOrUpdate(dishGenerator({name: "test disha", price: 10.1, concept: "Happy Birthday",parentGroup:groupsId[0]}));
        let dish4 = await Dish.createOrUpdate(dishGenerator({name: "test fisha", price: 15.2, concept: "NewYear",parentGroup:groupsId[0]}));
        let dish5 = await Dish.createOrUpdate(dishGenerator({name: "test fishw", price: 15.2, concept: "Happy Birthday",parentGroup:groupsId[0]}));
        
        let dishes = await Dish.find({})
        const dishesId = dishes.map(dish => dish.id)

        discInMemory.configDiscount.dishes = dishesId

        discountEx.configDiscount.dishes = dishesId

        await discountAdapter.addPromotionHandler(discInMemory)
        await discountAdapter.addPromotionHandler(discountEx)


        await Order.addDish({id: order.id}, dish1, 5, [], "", "testa2"); 
        await Order.addDish({id: order.id}, dish2, 4, [], "", "tes");
        await Order.addDish({id: order.id}, dish3, 5, [], "", "testa"); 
        await Order.addDish({id: order.id}, dish4, 4, [], "", "test");
        await Order.addDish({id: order.id}, dish5, 5, [], "", "testa1");


        //  17.7 + 12.16 + 19.95 = 49.81
        // await discountAdapter.addPromotionHandler(discInMemory)
        // await discountAdapter.addPromotionHandler(discountEx)
        
        order = await Order.findOne(order.id)
        await discountAdapter.processOrder(order)
        
        let result = await Order.findOne(order.id) //.populate("dishes");
        // console.log(result, "get discount order")
        expect(result.discountTotal).to.equal(49.81);
      });

      it("discount test dishes with 3 dif type of discount", async function () {
        let discountAdapter:AbstractPromotionAdapter = Adapter.getPromotionAdapter()
        let order = await Order.create({id: "test-3-types-of-discount"}).fetch();
        await Order.updateOne({id: order.id}, {concept: "3dif",user: "user"});

        let dish1 = await Dish.createOrUpdate(dishGenerator({name: "test dish2", price: 10.1, concept: "origin",parentGroup:groupsId[0]}));
        let dish2 = await Dish.createOrUpdate(dishGenerator({name: "test fish3", price: 15.2, concept: "origin",parentGroup:groupsId[0]}));
        let dish3 = await Dish.createOrUpdate(dishGenerator({name: "test dish4a", price: 10.1, concept: "origin",parentGroup:groupsId[0]}));
        let dish4 = await Dish.createOrUpdate(dishGenerator({name: "test fisha5", price: 15.2, concept: "NewYear",parentGroup:groupsId[0]}));
        let dish5 = await Dish.createOrUpdate(dishGenerator({name: "test fishw6", price: 15.2, concept: "NewYear",parentGroup:groupsId[0]}));

        let dishes = await Dish.find({})
        const dishesId = dishes.map(dish => dish.id)

        discInMemory.configDiscount.dishes = dishesId
        discountEx.configDiscount.dishes = dishesId
        disc1.configDiscount.dishes = dishesId

        await discountAdapter.addPromotionHandler(disc1)
        await discountAdapter.addPromotionHandler(discInMemory)
        await discountAdapter.addPromotionHandler(discountEx)

        await Order.addDish({id: order.id}, dish1, 5, [], "", "testa2");
        await Order.addDish({id: order.id}, dish2, 4, [], "", "tes");
        await Order.addDish({id: order.id}, dish3, 5, [], "", "testa");
        await Order.addDish({id: order.id}, dish4, 4, [], "", "test");
        await Order.addDish({id: order.id}, dish5, 5, [], "", "testa1");

        // 18.62  + 136.8 - 10% = 18.62 + 13,68 = 32.3+ (101 +60.8) - 10% = 32.3 + 16.18 = 48.48 + 14 = 62.48
        let result = await Order.findOne(order.id) //.populate("dishes");
        expect(result.discountTotal).to.equal(62.48);
      });
      
      // it("discount test displayDish", async function () {
      //   let discountAdapter:AbstractPromotionAdapter = Adapter.getPromotionAdapter()
      //   let order = await Order.create({id: "test-display-dish"}).fetch();
      //   await Order.updateOne({id: order.id}, {concept: "origin",user: "user"});

      //   let dish1 = await Dish.createOrUpdate(dishGenerator({name: "test dish2", price: 10.1, concept: "origin",parentGroup:groupsId[0]}));
      //   let dish2 = await Dish.createOrUpdate(dishGenerator({name: "test fish3", price: 15.2, concept: "origin",parentGroup:groupsId[0]}));

      //   discInMemory.configDiscount.dishes.push(dish1.id)
      //   discInMemory.configDiscount.dishes.push(dish2.id)

      //   discountEx.configDiscount.dishes.push(dish1.id)
      //   discountEx.configDiscount.dishes.push(dish2.id)

      //   await discountAdapter.addPromotionHandler(discInMemory)
      //   await discountAdapter.addPromotionHandler(discountEx)

      //   await Order.addDish({id: order.id}, dish1, 5, [], "", "testa2");
      //   await Order.addDish({id: order.id}, dish2, 4, [], "", "tes");
        
      //   let display = await Dish.display({ id: dish1.id })

      //   expect(display[0].id).to.equal(dish1.id);
      //   expect(display[0].discountAmount).to.equal(1.33);
      //   expect(display[0].discountType).to.equal("flat");
      // });
      
      it("discount test displayGroup", async function () {
        let discountAdapter:AbstractPromotionAdapter = Adapter.getPromotionAdapter()
        let order = await Order.create({id: "test-display-group"}).fetch();
        await Order.updateOne({id: order.id}, {concept: "origin",user: "user"});
        
        await discountAdapter.addPromotionHandler(discountEx)

        let group1:Group = groupGenerator()
        await Group.create(group1)

        let display = await Group.display({ id: group1.id })
        expect(display[0].id).to.equal(group1.id);
        expect(display[0].discountAmount).to.equal(1.33);
        expect(display[0].discountType).to.equal("flat");
      });
      



      it("discount test clearDiscount", async function () {
        let order = await Order.create({id: "test-clear-discount"}).fetch();
        await Order.updateOne({id: order.id}, {concept: "origin",user: "user"});
        let discountAdapter:AbstractPromotionAdapter = Adapter.getPromotionAdapter()

        let dish1 = await Dish.createOrUpdate(dishGenerator({name: "test dish", price: 10, concept: "origin",parentGroup:groupsId[0]}));

        discountEx.configDiscount.dishes.push(dish1.id)

        await discountAdapter.addPromotionHandler(discountEx)
        
        await Order.addDish({id: order.id}, dish1, 5, [], "", "test");

        // await discountAdapter.processOrder(order)
        
        await Adapter.getPromotionAdapter().clearOfPromotion(order.id)

        let result = await Order.findOne(order.id) 
        expect(result.discountTotal).to.equal(0);
      });
      
      it("discount test clearDiscount orderDish", async function () {
        let order = await Order.create({id: "test-clear-discount-OrderDish"}).fetch();
        await Order.updateOne({id: order.id}, {concept: "clear",user: "user"});
        let discountAdapter:AbstractPromotionAdapter = Adapter.getPromotionAdapter()

        let dish1 = await Dish.createOrUpdate(dishGenerator({name: "test dish", price: 10, concept: "clear",parentGroup:groupsId[0]}));
        discountEx.configDiscount.dishes.push(dish1.id)

        await discountAdapter.addPromotionHandler(discountEx)
        await Order.addDish({id: order.id}, dish1, 5, [], "", "test");

        // await Adapter.getPromotionAdapter().applyPromotion(order.id, discountEx.configDiscount, discountEx.id)

        // before clear
        let orderDishes1 = await OrderDish.find({ order: order.id }).populate("dish");
        // console.log(orderDishes1)
        expect(orderDishes1[0].discountTotal).to.equal(6.65);

        //after clear
        await Adapter.getPromotionAdapter().clearOfPromotion(order.id)
        let orderDishes = await OrderDish.find({ order: order.id }).populate("dish");
        // console.log(orderDishes)
        expect(orderDishes[0].discountTotal).to.equal(0);
      });

      it("discount test Adapter.getDiscount ", async function () {
        let order = await Order.create({id: "test-clear-discount-order-dish-adapter"}).fetch();
        await Order.updateOne({id: order.id}, {concept: "clear",user: "user"});
        // let Adapter.getPromotionAdapter() = DiscountAdapter.initialize()
        let a:AbstractPromotionAdapter =  Adapter.getPromotionAdapter()
        let dish1 = await Dish.createOrUpdate(dishGenerator({name: "test dish", price: 10, concept: "clear",parentGroup:groupsId[0]}));
        discountEx.configDiscount.dishes.push(dish1.id)

        await a.addPromotionHandler(discountEx)
        await Order.addDish({id: order.id}, dish1, 5, [], "", "test");
         
        // await discountAdapter.addPromotionHandler(discountEx)

        // await Adapter.getPromotionAdapter().applyPromotion(order.id, discountEx.configDiscount, discountEx.id)

        // before clear
        let orderDishes1 = await OrderDish.find({ order: order.id }).populate("dish");
        // console.log(orderDishes1)
        expect(orderDishes1[0].discountTotal).to.equal(6.65);

        //after clear
        await Adapter.getPromotionAdapter().clearOfPromotion(order.id)
        let orderDishes = await OrderDish.find({ order: order.id }).populate("dish");
        // console.log(orderDishes)
        expect(orderDishes[0].discountTotal).to.equal(0);
      });
      
      
      
     
      // if promotion returns
      

      /**
       * create 5 test groups() and create 3 discounts(1 isJoint=false, 1 for first 3 groups, 1 for 1 group from second case + 1)
       * joint Group check should be skiped this discount from display
       * isjoint don't display
       * check sortOrder last addded for isJoint = true then one by one use display 
       * check worktime
       * same for dishes
      */


})







 /**
       * 
       * 
    let orderDish = await OrderDish.find({
      order: order.id,
      dish: dishes[0].id,
    }).sort("createdAt ASC");

  it("addDish same dish increase amount", async function () {
    order = await Order.create({id: "adddish-same-dish-increase-amount-1"}).fetch();
    await Order.addDish({id: order.id}, dishes[0], 2, [], "", "test");
    await Order.addDish({id: order.id}, dishes[0], 3, [], "", "test");
    await Order.addDish({id: order.id}, dishes[0], 1, null, "", "test");

    let orderDishes = await OrderDish.find({ order: order.id, dish: dishes[0].id });
    expect(orderDishes.length).to.equals(1);
    expect(orderDishes[0].amount).to.equals(6);

    order = await Order.create({id:"adddish-same-dish-increase-amount-2"}).fetch();
    await Order.addDish({id: order.id}, dishes[0], 1, [{ id: dishes[1].id, modifierId: dishes[1].id }], "", "mod");
    await Order.addDish({id: order.id}, dishes[0], 1, null, "", "test");
    await Order.addDish({id: order.id}, dishes[0], 2, null, "", "test");
    orderDishes = await OrderDish.find({ order: order.id, dish: dishes[0].id });
    expect(orderDishes.length).to.equals(2);
    for (let dish of orderDishes) {
      if (dish.modifiers.length == 1) {
        expect(dish.amount).to.equals(1);
      } else {
        expect(dish.amount).to.equals(3);
      }
    }
  });
       */