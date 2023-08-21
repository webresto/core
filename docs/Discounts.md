# Promotions & markups

### Promotion 
Promotions are implemented through a **singleton** promotionadapter. Each promotion falls into the `promotion` model and corresponds to the fields of this model. And the model controls the inclusion and sorting of promotions.

> ⚠️ Any Promotion must be passed to the `Promotion` model through the `PromotionAdapter.addPromotionHandler()` method. Example: `await PromotionAdapter.addPromotionHandler( promotion: AbstractPromotionHandler );`

Promotion model has this props:
- `configDiscount`: Json, has fields discountAmount: number;  discountType: "flat" | "percentage"; dishes: string[],
    groups: string[] and excludeModifiers: boolean; all this fields described in IconfigDiscount interface
- `createdBy`: String, show who is responsible for creating this promotion
- `name`: String, required (for human visualization)
- `concept`: String[], Promotion concept which represent promotion's group of usage
- `sortOrder`: Number, 
- `description`: String
- `isMarkup`: Boolean
- `isPublic`: Boolean, Show if promotion is available by API for customer
- `isJoint`: Boolean, Show if promotion is available to use it together with other promotions, first use isJoint = false promotions(once) if there are no false promotions then use isJoint=true
- `enable`: Boolean, Can we use this promotion, User can disable this promotion
- `isDeleted`: Boolean, No active class in Promotion Adapter
- `productCategoryPromotions`: json, 
- `hash`: String, hashsum of promotion to check if promotion is already created
- `worktime`: WorkTime[], use import { WorkTimeValidator } from "@webresto/worktime"; to implement


### Default promotion adapter
The promotion adapter is provided with the core, but can be replaced through the variable settings `Default_promotion_adapter`.

If you decide to replace the promotion adapter, you will have to implement it as `AbstractbonusProgramadapter` from`@Webresto/Core/Adapters/promotion/Abstractbonusprogramadapter.ts`.

> ⚠️ Please note that the promotion adapter is implemented as Singleton

> ⚠️ In order for the core to use the promotion system, the RMS adapter must have promotion support.

> ⚠️ To use any method of `PromotionAdapter` call Adapter.getPromotionAdapter() and use return value as the adapter

### Flow
For e-commerce, the promotion can work when added to the basket, or only when passing a check.Or in both cases.
 
**Promotions in the basket**
At the time of passing the modification of the basket, the nucleus will cause the Apply method and transmit an order to it.Further, this method will carry out the `ISJOINT: True` promotions, and if at least one coincides, it will stop execution.Otherwise, it will take place according to the summarized promotions, and each which will be applied Buden is assigned in the order.

The core will calculate the promotion on each dish and will take this into account in the final cost of the basket.
Each time the baskets of the basket will take place, all previous promotions will be deleted.
During the passage of the Chekout, promotions will be relying.

**Promotions in the interface**
`ISPUBLIC: True` when requesting a group or product, the promotion will be calculated based on Worktime, Enable
Promotions that are displayed in the interface cannot be single, for the flag `isjoint: true` will not be taken into account even if the flag is` Ispublic: true`.

> ⚠️  You can use this mechanism to display the user's personal promotions, as he transfers the user when calculating the promotion


The public promotion can turn on a banner, or make some other action if such a connection is available through Emmiter `Emmit (` Apply-Promotion`, Promotion) `

**Example**
First we have to create promotion. We can use `discountGenerator` which have 1 argument config with type `AbstractPromotionHandler` 
and return promotion with type `AbstractPromotionHandler`

let promotionflat:AbstractPromotionHandler = discountGenerator({
      concept: ["origin"],
      id: 'promId',
      isJoint: true,
      name: 'name',
      isPublic: true,
      configDiscount: {
        discountType: "flat", // or "percentage"
        discountAmount: 1,
        dishes: dishesIdsPromotionCanBeUsedFor,  // string[]
        groups: groupsIdsPromotionCanBeUsedFor,  // string[]
        excludeModifiers: true
      },
})


Then call adapter to get PromotionAdapter

`let promotionAdapter:AbstractPromotionAdapter = Adapter.getPromotionAdapter()`

To add promotion call 
`await promotionAdapter.addPromotionHandler(promotionflat)`

Also to add promotion to dataBase without `PromotionAdapter` in case if it's created by User we should create promotion with `type Promotion` 

let createInModelPromotion: Promotion = {
      id: 'promotion-id',
      isJoint: false,
      name: "Promotion",
      isPublic: true,
      isDeleted: false,
      createdByUser: true,
      description: "decription",
      concept: ["amongus"],
      configDiscount: {
        discountType: "flat", // or "percentage"
        discountAmount: 1,
        dishes: dishesIdsPromotionCanBeUsedFor,  // string[]
        groups: groupsIdsPromotionCanBeUsedFor,  // string[]
        excludeModifiers: true
      },
      sortOrder: 0,
      externalId: "Promotion-exid",
      worktime: null,
      enable: true
};

And add it with 
`await Promotion.createOrUpdate(createInModelPromotion);`

After we add promotion this way it's check with `afterCreate()` if PromotionAdater has this promotion and add to PromotionAdapter this
 promotion as `ConfiguredPromotion` 

Then each time countCart is trigged (for example after `Order.addDish()`) it calls `PromotionAdapter.processOrder()` which filter the 
promotions to find which fit to current order (if find promotion with field isJoint: false which fit current order then stop searching and
call only this promotion) and then call actions of promotions to calculate discount and update Order and OrderDish with new discountTotal



### customizable and programmable promotion

**Completed**
The adapter supplied with the core has support for promotion configurations for certain groups, or/and dishes
Each record in the model will create a copy of the custom promotion.So that such a promotion created by the user through the admin panel is
distinguishable, we use a sign of `Creedby: 'adminpanel'`


**Programmable**
Since the promotion is a copy of the class, we can realize any logic of such a promotion.

> ⚠️ We do not recommend using promotions to describe complex promotions, use the Promotions adapter for this

The Promotion should be implemented as an adapter from the abstract class `@webresto/core/adapters/promotion/AbstractPromotion.ts` and added to
the model via> `PromotionAdapter.addPromotionHandler()`. The adapter is responsible for recording transactions in an external source or syncing
from an external source by implementing the abstract class `AbstractPromotionAdapter`.




### to do:
1./