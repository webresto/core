import dishGenerator from '../../generators/dish.generator';
import { expect } from 'chai';

// import AbstractPromotionHandler from '@webresto/core/adapters/discount/AbstractPromotion';
import { InMemoryDiscountAdapter } from '../../mocks/adapter/discount';

import AbstractPromotionHandler from '../../../adapters/promotion/AbstractPromotion';
import { PromotionAdapter } from '../../../adapters/promotion/default/promotionAdapter';
import findModelInstanceByAttributes from '../../../libs/findModelInstance';
import { Adapter } from '../../../adapters/index';
// todo: fix types model instance to {%ModelName%}Record for Group';
// todo: fix types model instance to {%ModelName%}Record for Dish';
// todo: fix types model instance to {%ModelName%}Record for Order';
import { someInArray } from '../../../libs/stringsInArray';
import ConfiguredPromotion from '../../../adapters/promotion/default/configuredPromotion';
import Decimal from 'decimal.js';
import { DishRecord } from '../../../models/Dish';
import { GroupRecord } from '../../../models/Group';
import { OrderRecord, PromotionState } from '../../../models/Order';

describe('Discount_Empty', function () {
  after(async function () {
    // await Promotion.destroy({})
  })

  let discountEx: AbstractPromotionHandler = {
    id: "1-id",
    configDiscount: {
      discountType: "flat",
      discountAmount: 1.33,
      dishes: ["a"],
      groups: ["a"],
      excludeModifiers: true
    },
    badge: 'test',
    name: "1-name",
    description: "string",
    concept: [""],
    condition: (arg: GroupRecord | DishRecord | OrderRecord): boolean => {
      if (findModelInstanceByAttributes(arg) === "Order" && (discountEx.concept[0] === undefined || discountEx.concept[0] === "")
        ? true : someInArray(arg.concept, discountEx.concept)) {
        // Order.populate()
        //discountEx.concept.includes(arg.concept)
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
    displayGroup: function (group: GroupRecord, user?: string): GroupRecord {
      if (this.isJoint === true && this.isPublic === true) {

        group.discountAmount = Adapter.getPromotionAdapter().promotions[this.id].configDiscount.discountAmount;
        group.discountType = Adapter.getPromotionAdapter().promotions[this.id].configDiscount.discountType;
      }

      return group
    },
    displayDish: function (dish: DishRecord, user?: string): DishRecord {
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
  let groupsId: any[] = []

  let promotionAdapter: PromotionAdapter;
  before(async () => {
    // Stop all
    await Promotion.update({}, {enable: false}).fetch()


    // define
    promotionAdapter = Adapter.getPromotionAdapter()
    configuredPromotion = new ConfiguredPromotion(discountEx, discountEx.configDiscount)
    const groups = await Group.find({})
    groupsId = groups.map(group => group.id)
    discountEx.configDiscount.groups = groupsId
    await Promotion.update({id: "1-id"}, {enable: true}).fetch()
  })

  it("discount empty concept", async function () {

    let order = await Order.create({ id: "add-dish-empty-concept" }).fetch();
    await Order.updateOne({ id: order.id }, { user: "user" });

    let dish1 = await Dish.createOrUpdate(dishGenerator({ name: "test dish", price: 10.1, concept: "a", parentGroup: groupsId[0] }));
    let dish2 = await Dish.createOrUpdate(dishGenerator({ name: "test fish", price: 15.2, concept: "a", parentGroup: groupsId[0] }));

    discountEx.configDiscount.dishes.push(dish1.id)
    discountEx.configDiscount.dishes.push(dish2.id)
    await promotionAdapter.addPromotionHandler(discountEx)

    await Order.addDish({ id: order.id }, dish1, 5, [], "", "user");
    await Order.addDish({ id: order.id }, dish2, 4, [], "", "user");

    let result = await Order.findOne(order.id)
    expect(result.discountTotal).to.equal(11.97);
  });


  // TODO: move INTEGRATION
  it("discount empty concept but order with concept", async function () {

    let order = await Order.create({ id: "empty-concept" }).fetch();
    await Order.updateOne({ id: order.id }, { user: "user" });

    let dish1 = await Dish.createOrUpdate(dishGenerator({ name: "test dish", price: 10.1, concept: "a", parentGroup: groupsId[0] }));
    let dish2 = await Dish.createOrUpdate(dishGenerator({ name: "test fish", price: 15.2, concept: "a", parentGroup: groupsId[0] }));

    discountEx.configDiscount.dishes.push(dish1.id)
    discountEx.configDiscount.dishes.push(dish2.id)
    await promotionAdapter.addPromotionHandler(discountEx)

    await Order.addDish({ id: order.id }, dish1, 5, [], "", "user");
    await Order.addDish({ id: order.id }, dish2, 4, [], "", "user");

    let result = await Order.findOne(order.id)
    // console.log(JSON.stringify(result, null, 2))
    expect(result.discountTotal).to.equal(11.97);
  });

})




