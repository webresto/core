# Discounts & markups

### Discount 
Discounts are implemented through a **singleton** discountadapter. Each discount falls into the `discount` model and corresponds to the fields of this model.And the model controls the inclusion and sorting of discounts.



> ⚠️ Any Discount must be passed to the `Discount` model in the `DiscountAdapter.addDiscountHandler()` method. Example: `await DiscountAdapter.addDiscountHandler(new Discount());`

Discount model has this props:
- `configDiscount`: Json, has fields discount: string; and discountType: string;
- `createdBy`: String, show who is responsible for creating this discount
- `name`: String, required (for human visualization)
- `concept`: String[], Discount concept which represent discount's group of usage
- `sortOrder`: Number, 
- `description`: String
- `isMarkup`: Boolean
- `isPublic`: Boolean, Show if discount is available by API for customer
- `isJoint`: Boolean, Show if discount is available to use it together with other discounts, first use isJoint = false discounts(once) then true
- `enable`: Boolean, Can we use this discount, User can disable this discount
- `isDeleted`: Boolean, No active class in Discount Adapter
- `productCategoryDiscounts`: json, 
- `hash`: String, hashsum of discount to check if discount is already created
- `worktime`: WorkTime[], use import { WorkTimeValidator } from "@webresto/worktime"; to implement


### Default discount adapter
The discount adapter is provided with the core, but can be replaced through the variable settings `Default_discount_adapter`.

If you decide to replace the discount adapter, you will have to implement it as `AbstractbonusProgramadapter` from`@Webresto/Core/Adapters/Discount/Abstractbonusprogramadapter.ts`.

> ⚠️ Please note that the discount adapter is implemented as Singleton

> ⚠️ In order for the core to use the discount system, the RMS adapter must have discount support.

### Flow
For e-commerce, the discount can work when added to the basket, or only when passing a check.Or in both cases.
 
**Discounts in the basket**
At the time of passing the modification of the basket, the nucleus will cause the Apply method and transmit an order to it.Further, this method will carry out the `ISJOINT: True` discounts, and if at least one coincides, it will stop execution.Otherwise, it will take place according to the summarized discounts, and each which will be applied Buden is assigned in the order.

The core will calculate the discount on each dish and will take this into account in the final cost of the basket.
Each time the baskets of the basket will take place, all previous discounts will be deleted.
During the passage of the Chekout, discounts will be relying.

**Discounts in the interface**
`ISPUBLIC: True` when requesting a group or product, the discount will be calculated based on Worktime, Enable
Discounts that are displayed in the interface cannot be single, for the flag `isjoint: true` will not be taken into account even if the flag is` Ispublic: true`.

> ⚠️  You can use this mechanism to display the user's personal discounts, as he transfers the user when calculating the discount


The public discount can turn on a banner, or make some other action if such a connection is available through Emmiter `Emmit (` Apply-Discount`, Discount) `

### customizable and programmable discount

**Completed**
The adapter supplied with the core has support for discount configurations for certain groups, or/and dishes
Each record in the model will create a copy of the custom discount.So that such a discount created by the user through the admin panel is distinguishable, we use a sign of `Creedby: 'adminpanel'`


**Programmable**
Since the discount is a copy of the class, we can realize any logic of such a discount.

> ⚠️ We do not recommend using discounts to describe complex promotions, use the Promotions adapter for this

The Discount should be implemented as an adapter from the abstract class `@webresto/core/adapters/discount/AbstractDiscount.ts` and added to the model via> `DiscountAdapter.add()`. The adapter is responsible for recording transactions in an external source or syncing from an external source by implementing the abstract class `AbstractDiscountHandlerINSTANCE`.




### to do:
1. Add condition, action, displayGroupDiscount, displayGroupDish abstract methods and implementation
2. Add discount to Order
3. tests