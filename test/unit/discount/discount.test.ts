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
// todo: fix types model instance to {%ModelName%}Record for Group';
// todo: fix types model instance to {%ModelName%}Record for Dish';
// todo: fix types model instance to {%ModelName%}Record for Order';
import { someInArray, stringsInArray } from '../../../libs/stringsInArray';
import ConfiguredPromotion from '../../../adapters/promotion/default/configuredPromotion';
import Decimal from 'decimal.js';
import { PromotionAdapter } from '../../../adapters/promotion/default/promotionAdapter';
import { DishRecord } from '../../../models/Dish';
import { GroupRecord } from '../../../models/Group';
import { OrderRecord, PromotionState } from '../../../models/Order';

describe('Discount', function () {
   
   // TODO: tests throw get adapter
   
    // let order: OrderRecord;
    // let dishes: DishRecord[];
    // let fullOrder: Order;
    after(async function() {
      // await Promotion.destroy({})
    })

    let discInMemory = new InMemoryDiscountAdapter
  
    // TODO: I dont understand for what needed this discount if we have configuredDisocunt
    let discountEx:AbstractPromotionHandler =  {
        id: "1-id",
        badge: 'test',
        configDiscount: {
            discountType: "flat",
            discountAmount: 1.33,
            dishes: ["a"],
            groups: ["a"],
            excludeModifiers: true
          },
        name: "1-name",
        description: "string",
        concept: ["origin","clear","Happy Birthday","3dif","Display Dish"],
        condition: (arg: GroupRecord | DishRecord | OrderRecord): boolean =>{
          if (findModelInstanceByAttributes(arg) === "Order" && someInArray(arg.concept, discountEx.concept) ) {
            // Order.populate()
            //discountEx.concept.includes(arg.concept)
            return true;
          }
        
          if (findModelInstanceByAttributes(arg) === "Dish" && someInArray(arg.concept, discountEx.concept)) {
            return someInArray(arg.id, discountEx.configDiscount.dishes)
              // TODO: check if includes in IconfigDish
              return true;
          }
          
          if (findModelInstanceByAttributes(arg) === "Group" && someInArray(arg.concept, discountEx.concept) ) {
              // TODO: check if includes in IconfigG
              return true;
          }
          
          return false
      },
        action: async (order: OrderRecord): Promise<PromotionState> => {
             return await configuredPromotion.applyPromotion(order) 
        },
        isPublic: true,
        isJoint: true,
        // sortOrder: 0,
        displayGroup:  function (group: GroupRecord, user?: string): GroupRecord {
          if (this.isJoint === true && this.isPublic === true) {
          
            group.discountAmount = Adapter.getPromotionAdapter().promotions[this.id].configDiscount.discountAmount;
            group.discountType = Adapter.getPromotionAdapter().promotions[this.id].configDiscount.discountType;
           }
           
          return group
        },
        displayDish: function (dish: DishRecord, user?: string): DishRecord {
          // if (this.isJoint === true && this.isPublic === true) {
          //   // 
            dish.discountAmount = Adapter.getPromotionAdapter().promotions[this.id].configDiscount.discountAmount;
            dish.discountType = Adapter.getPromotionAdapter().promotions[this.id].configDiscount.discountType;
            dish.oldPrice = dish.salePrice
            dish.salePrice = this.configDiscount.discountType === "flat" 
            ? new Decimal(dish.price).minus(+this.configDiscount.discountAmount).toNumber()
            : new Decimal(dish.price)
                .mul(+this.configDiscount.discountAmount / 100)
                .toNumber()  
          // }
          return dish
        },
        externalId: "1-externalId",
    }

    let configuredPromotion: ConfiguredPromotion
    let configuredPromotionFromMemory: ConfiguredPromotion
    let groupsId: any[] = []


    let disc1:AbstractPromotionHandler = discountGenerator({
      concept: ["origin","3dif"],
      id: 'aa2-id',
      isJoint: true,
      name: 'awdawd',
      badge: 'test',
      isPublic: true,
      configDiscount: {
        discountType: "flat",
        discountAmount: 1,
        dishes: ["Aaa"],
        groups: [],
        excludeModifiers: true
      }
    })
    let discountsArray = [disc1, discInMemory, discountEx]

    let promotionAdapter: PromotionAdapter;

    before(async () =>{
      promotionAdapter =  Adapter.getPromotionAdapter()
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


      // it("discount applyPromotion flat on order", async function () {
      //   let promotionAdapter = Adapter.getPromotionAdapter()
      //   let order = await Order.create({id: "add-dish-with-discount"}).fetch();
      //   await Order.updateOne({id: order.id}, {concept: "origin",user: "user"});

      //   let dish1 = await Dish.createOrUpdate(dishGenerator({name: "test dish", price: 10, concept: "origin",parentGroup:groupsId[0]}));
      //   discountEx.configDiscount.dishes.push(dish1.id)
      //   await promotionAdapter.addPromotionHandler(discountEx)

      //   await Order.addDish({id: order.id}, dish1, 5, [], "", "user");

      //   await Adapter.getPromotionAdapter().clearOfPromotion(order)
      //   await configuredPromotion.applyPromotion(order.id)

      //   let result = await Order.findOne(order.id) 
      //   expect(result.discountTotal).to.equal(6.65);
      // });

      
      it("discount applyPromotion flat on order with different dishes", async function () {
        
        let order = await Order.create({id: "add-dish-with-discounts"}).fetch();
        await Order.updateOne({id: order.id}, { user: "user"});

        let dish1 = await Dish.createOrUpdate(dishGenerator({name: "test dish", price: 10.1, concept: "origin",parentGroup:groupsId[0]}));
        let dish2 = await Dish.createOrUpdate(dishGenerator({name: "test fish", price: 15.2, concept: "origin",parentGroup:groupsId[0]}));
        
        discountEx.configDiscount.dishes.push(dish1.id)
        discountEx.configDiscount.dishes.push(dish2.id)
        await promotionAdapter.addPromotionHandler(discountEx)

        await Order.addDish({id: order.id}, dish1, 5, [], "", "user");
        await Order.addDish({id: order.id}, dish2, 4, [], "", "user");

        // let result1 = await Dish.findOne(dish1.id)
        await Adapter.getPromotionAdapter().clearOfPromotion(order)
        await configuredPromotion.applyPromotion(order)
        expect(order.promotionFlatDiscount).to.equal(11.97);
      });

      it("discount decimal check on order with different dishes", async function () {
        
        let order = await Order.create({id: "apply-to-ordersa"}).fetch();
        await Order.updateOne({id: order.id}, {user: "user"});

        //Decimal check 15.2,  10.1
        let dish1 = await Dish.createOrUpdate(dishGenerator({name: "test disha", price: 10.1, concept: "clear",parentGroup:groupsId[0]}));
        let dish2 = await Dish.createOrUpdate(dishGenerator({name: "test fisha", price: 15.2, concept: "clear",parentGroup:groupsId[0]}));
        discountEx.configDiscount.dishes.push(dish1.id)
        discountEx.configDiscount.dishes.push(dish2.id)

        await promotionAdapter.addPromotionHandler(discountEx)

        await Order.addDish({id: order.id}, dish1, 5, [], "", "user");
        await Order.addDish({id: order.id}, dish2, 4, [], "", "user");


        order = await Order.findOne(order.id)

        await promotionAdapter.processOrder(order)

        expect(order.promotionFlatDiscount).to.equal(11.97);

        let dish3 = await Dish.createOrUpdate(dishGenerator({name: "test disha", price: 10, concept: "a",parentGroup:groupsId[0]}));
        let dish4 = await Dish.createOrUpdate(dishGenerator({name: "test fisha", price: 15, concept: "a",parentGroup:groupsId[0]}));
        await Order.addDish({id: order.id}, dish3, 5, [], "", "user");
        await Order.addDish({id: order.id}, dish4, 4, [], "", "user");

        await promotionAdapter.processOrder(order)
        expect(order.promotionFlatDiscount).to.equal(11.97);

      });

            

      it("discount applyPromotion percentage on order with different dishes", async function () {
        
        let order = await Order.create({id: "add-dish-with-discountsa"}).fetch();
        await Order.updateOne({id: order.id}, {user: "user"});

        let dish1 = await Dish.createOrUpdate(dishGenerator({name: "test dish", price: 10.1, concept: "origin",parentGroup:groupsId[0]}));
        let dish2 = await Dish.createOrUpdate(dishGenerator({name: "test fish", price: 15.2, concept: "origin",parentGroup:groupsId[0]}));
        
        discInMemory.configDiscount.dishes.push(dish1.id)
        discInMemory.configDiscount.dishes.push(dish2.id)

        await promotionAdapter.addPromotionHandler(discInMemory)

        await Order.addDish({id: order.id}, dish1, 5, [], "", "user");
        await Order.addDish({id: order.id}, dish2, 4, [], "", "user");

        // DiscountAdapter.applyToOrder(order)
        await Adapter.getPromotionAdapter().clearOfPromotion(order)
        await configuredPromotionFromMemory.applyPromotion(order)

//        let result = await Order.findOne(order.id) //.populate("dishes");
        expect(order.promotionFlatDiscount).to.equal(11.13);
      });
      
      it("discount test dishes with flat and percentage types of discounts but same concept", async function () {
        
        let order = await Order.create({id: "test-discounts-on-different-types"}).fetch();
        await Order.updateOne({id: order.id}, {user: "user"});

        let dish1 = await Dish.createOrUpdate(dishGenerator({name: "test dish", price: 10.1, concept: "Happy Birthday",parentGroup:groupsId[0]}));
        let dish2 = await Dish.createOrUpdate(dishGenerator({name: "test fish", price: 15.2, concept: "Happy Birthday",parentGroup:groupsId[0]}));
        let dish3 = await Dish.createOrUpdate(dishGenerator({name: "test disha", price: 10.1, concept: "Happy Birthday",parentGroup:groupsId[0]}));
        let dish4 = await Dish.createOrUpdate(dishGenerator({name: "test fisha", price: 15.2, concept: "Happy Birthday",parentGroup:groupsId[0]}));
        let dish5 = await Dish.createOrUpdate(dishGenerator({name: "test fishw", price: 15.2, concept: "Happy Birthday",parentGroup:groupsId[0]}));
        
        discInMemory.configDiscount.dishes = [dish1.id, dish2.id]
        discountEx.configDiscount.dishes = [dish3.id, dish4.id, dish5.id]


        await promotionAdapter.addPromotionHandler(discInMemory)
        await promotionAdapter.addPromotionHandler(discountEx)

        await Order.addDish({id: order.id}, dish1, 5, [], "", "user");
        await Order.addDish({id: order.id}, dish2, 4, [], "", "user");
        await Order.addDish({id: order.id}, dish3, 5, [], "", "user");
        await Order.addDish({id: order.id}, dish4, 4, [], "", "user");
        await Order.addDish({id: order.id}, dish5, 5, [], "", "user");
                
        order = await Order.findOne(order.id)
        
     //   let result = await Order.findOne(order.id)
        expect(order.promotionFlatDiscount).to.equal(29.75);
      });
      
      // it("111 discount test dishes with flat and percentage types of discounts but different concept", async function () {
        
      //   let order = await Order.create({id: "test-different-types-and-concept"}).fetch();
      //   await Order.updateOne({id: order.id}, {user: "user"});

      //   let dish1 = await Dish.createOrUpdate(dishGenerator({name: "test dish", price: 10.1, concept: "Happy Birthday",parentGroup:groupsId[0]}));
      //   let dish2 = await Dish.createOrUpdate(dishGenerator({name: "test fish", price: 15.2, concept: "NewYear",parentGroup:groupsId[0]}));
      //   let dish3 = await Dish.createOrUpdate(dishGenerator({name: "test disha", price: 10.1, concept: "Happy Birthday",parentGroup:groupsId[0]}));
      //   let dish4 = await Dish.createOrUpdate(dishGenerator({name: "test fisha", price: 15.2, concept: "NewYear",parentGroup:groupsId[0]}));
      //   let dish5 = await Dish.createOrUpdate(dishGenerator({name: "test fishw", price: 15.2, concept: "Happy Birthday",parentGroup:groupsId[0]}));
        
      //   discInMemory.configDiscount.dishes = [dish1.id, dish2.id]
      //   discountEx.configDiscount.dishes = [dish3.id, dish4.id, dish5.id]
      //   await promotionAdapter.addPromotionHandler(discInMemory)
      //   await promotionAdapter.addPromotionHandler(discountEx)


      //   await Order.addDish({id: order.id}, dish1, 5, [], "", "user"); 
      //   await Order.addDish({id: order.id}, dish2, 4, [], "", "user");
      //   await Order.addDish({id: order.id}, dish3, 5, [], "", "user"); 
      //   await Order.addDish({id: order.id}, dish4, 4, [], "", "user");
      //   order = await Order.findOne(order.id).populate('dishes')

      //   await Order.addDish({id: order.id}, dish5, 5, [], "", "user");
      //   console.log( discountsArray)

      //   order = await Order.findOne(order.id).populate('dishes')
      //   let basketDiscount = 0;
      //   let discounts = new Map
      //   for(const dish of order.dishes)  {
      //     if(typeof dish !== 'number') {
      //       if(dish.addedBy !== "user") continue;
      //       discounts.set(dish.discountId, true);
      //       console.log(11111,dish,dish.discountId, discountsArray)
      //       let discount = discountsArray.find((d)=> d.id === dish.discountId);
      //       if(discount.configDiscount.discountType === "flat"){
      //         expect(dish.discountAmount).to.equal(discount.configDiscount.discountAmount);
      //         basketDiscount += discount.configDiscount.discountAmount * dish.amount
      //       } else {
      //         expect(dish.discountAmount).to.equal(discount.configDiscount.discountAmount * 0.01 * dish.itemPrice);
      //         basketDiscount += (discount.configDiscount.discountAmount * 0.01 * dish.itemPrice * dish.amount) 
      //       }
      //     }
      //   } 
      //   expect(discounts.size).to.equal(2)
      //   expect(basketDiscount).to.equal(order.promotionFlatDiscount);
      //   expect(order.promotionFlatDiscount).to.equal(32.11); // Hardcoded for 1 discount for dish
      // });

      // it("discount test dishes with 3 dif type of discount", async function () {
        
      //   let order = await Order.create({id: "test-3-types-of-discount"}).fetch();
      //   await Order.updateOne({id: order.id}, {user: "user"});

      //   let dish1 = await Dish.createOrUpdate(dishGenerator({name: "test dish2", price: 10.1, concept: "origin",parentGroup:groupsId[0]}));
      //   let dish2 = await Dish.createOrUpdate(dishGenerator({name: "test fish3", price: 15.2, concept: "origin",parentGroup:groupsId[0]}));
      //   let dish3 = await Dish.createOrUpdate(dishGenerator({name: "test dish4a", price: 10.1, concept: "origin",parentGroup:groupsId[0]}));
      //   let dish4 = await Dish.createOrUpdate(dishGenerator({name: "test fisha5", price: 15.2, concept: "NewYear",parentGroup:groupsId[0]}));
      //   let dish5 = await Dish.createOrUpdate(dishGenerator({name: "test fishw6", price: 15.2, concept: "NewYear",parentGroup:groupsId[0]}));

      //   let dishes = await Dish.find({})
      //   const dishesId = dishes.map(dish => dish.id)

      //   discInMemory.configDiscount.dishes = dishesId
      //   discountEx.configDiscount.dishes = dishesId
      //   disc1.configDiscount.dishes = dishesId

      //   await promotionAdapter.addPromotionHandler(disc1) 
      //   await promotionAdapter.addPromotionHandler(discInMemory)
      //   await promotionAdapter.addPromotionHandler(discountEx)

      //   await Order.addDish({id: order.id}, dish1, 5, [], "", "user");
      //   await Order.addDish({id: order.id}, dish2, 4, [], "", "user");
      //   await Order.addDish({id: order.id}, dish3, 5, [], "", "user");
      //   await Order.addDish({id: order.id}, dish4, 4, [], "", "user");
      //   await Order.addDish({id: order.id}, dish5, 5, [], "", "user");

      //   let result = await Order.findOne(order.id) //.populate("dishes");
        
      //   let orderTotal = dish1.price * 5 + dish2.price * 4 + dish3.price * 5 + dish4.price * 4 + dish5.price * 5;
      //   expect(result.basketTotal).to.equal(orderTotal);
      //   expect(result.discountTotal).to.equal(32.3);
      // });
      
      it("discount test displayDish", async function () {
        
        let dish1 = await Dish.createOrUpdate(dishGenerator({name: "test dish2", price: 10.1, concept: "Display Dish",parentGroup:groupsId[0]}));
        let dish2 = await Dish.createOrUpdate(dishGenerator({name: "test fish3", price: 15.2, concept: "Display Dish",parentGroup:groupsId[0]}));

        discInMemory.configDiscount.dishes.push(dish1.id)
        discInMemory.configDiscount.dishes.push(dish2.id)

        discountEx.configDiscount.dishes.push(dish1.id)
        discountEx.configDiscount.dishes.push(dish2.id)
        disc1.configDiscount.dishes.push(dish1.id)

        await promotionAdapter.addPromotionHandler(discInMemory)
        await promotionAdapter.addPromotionHandler(discountEx)
        
        let display = await Dish.display({ id: dish1.id })

        expect(display[0].id).to.equal(dish1.id);
        expect(display[0].discountAmount).to.equal(1.33);
        expect(display[0].discountType).to.equal("flat");
      });
      
      it("discount test displayGroup", async function () {
        
        let order = await Order.create({id: "test-display-group"}).fetch();
        await Order.updateOne({id: order.id}, {user: "user"});
        
        await promotionAdapter.addPromotionHandler(discountEx)

        let group1:GroupRecord = groupGenerator()
        await Group.create(group1)

        let display = await Group.display({ id: group1.id })
        expect(display[0].id).to.equal(group1.id);
        expect(display[0].discountAmount).to.equal(1.33);
        expect(display[0].discountType).to.equal("flat");
      });
      



      it("discount test clearDiscount", async function () {
        let order = await Order.create({id: "test-clear-discount"}).fetch();
        await Order.updateOne({id: order.id}, {user: "user"});
        

        let dish1 = await Dish.createOrUpdate(dishGenerator({name: "test dish", price: 10, concept: "origin",parentGroup:groupsId[0]}));

        discountEx.configDiscount.dishes.push(dish1.id)

        await promotionAdapter.addPromotionHandler(discountEx)
        
        await Order.addDish({id: order.id}, dish1, 5, [], "", "user");

        // await promotionAdapter.processOrder(order)
        
        await Adapter.getPromotionAdapter().clearOfPromotion(order)

        let result = await Order.findOne(order.id) 
        expect(result.discountTotal).to.equal(0);
      });
      
      it("discount test clearDiscount orderDish", async function () {
        let order = await Order.create({id: "test-clear-discount-OrderDish"}).fetch();
        await Order.updateOne({id: order.id}, {user: "user"});
        

        let dish1 = await Dish.createOrUpdate(dishGenerator({name: "test dish", price: 10, concept: "clear",parentGroup:groupsId[0]}));
        discountEx.configDiscount.dishes.push(dish1.id)

        await promotionAdapter.addPromotionHandler(discountEx)
        await Order.addDish({id: order.id}, dish1, 5, [], "", "user");

        // before clear
        let orderDishes1 = await OrderDish.find({ order: order.id }).populate("dish");
        expect(orderDishes1[0].discountTotal).to.equal(6.65);

        //after clear
        await Adapter.getPromotionAdapter().clearOfPromotion(order)
        let orderDishes = await OrderDish.find({ order: order.id }).populate("dish");

        expect(orderDishes[0].discountTotal).to.equal(0);
      });

      it("discount test Adapter.getDiscount ", async function () {
        let order = await Order.create({id: "test-clear-discount-order-dish-adapter"}).fetch();
        await Order.updateOne({id: order.id}, {user: "user"});
        // let Adapter.getPromotionAdapter() = DiscountAdapter.initialize()
        let a:AbstractPromotionAdapter =  Adapter.getPromotionAdapter()
        let dish1 = await Dish.createOrUpdate(dishGenerator({name: "test dish", price: 10, concept: "clear",parentGroup:groupsId[0]}));
        discountEx.configDiscount.dishes.push(dish1.id)

        await a.addPromotionHandler(discountEx)
        await Order.addDish({id: order.id}, dish1, 5, [], "", "user");

        // before clear
        let orderDishes1 = await OrderDish.find({ order: order.id }).populate("dish");

        expect(orderDishes1[0].discountTotal).to.equal(6.65);

        //after clear
        await Adapter.getPromotionAdapter().clearOfPromotion(order)
        let orderDishes = await OrderDish.find({ order: order.id }).populate("dish");

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
      */;
})