# Discounts

Discounts are implemented through a DiscountAdapter, managed by the Discount model. 
This Discount includes:
- `configDiscount`: Json, has fields discount: string; and discountType: string;
- `createdByUser`: Boolean, show who is responsible for creating this discount
- `name`: String, required (for human visualization)
- `concept`: String[], Discount concept which represent discount's group of usage
- `sortOrder`: Number, 
- `description`: String
- `isPublic`: Boolean, Show if discount is available by API for customer
- `isJoint`: Boolean, Show if discount is available to use it together with other discounts, first use isJoint = false discounts(once) then true
- `enable`: Boolean, Can we use this discount, User can disable this discount
- `isDeleted`: Boolean, No active class in Discount Adapter
- `productCategoryDiscounts`: json, 
- `hash`: String, hashsum of discount to check if discount is already created
- `worktime`: WorkTime[], use import { WorkTimeValidator } from "@webresto/worktime"; to implement

The Discount should be implemented as an adapter from the abstract class `@webresto/core/adapters/discount/AbstractDiscount.ts` and added to the model via `DiscountAdapter.add()`. The adapter is responsible for recording transactions in an external source or syncing from an external source by implementing the abstract class `AbstractDiscountHandlerINSTANCE`.

> ⚠️ Any Discount must be passed to the `Discount` model in the `DiscountAdapter.add()` method. Example: `await DiscountAdapter.add(new Discount());`

> ⚠️ Each time discounts getting with Model check if worktime still go on

### Flow

Bonuses will be added to the order during the order check and when order reach price thresholds, but they will be deducted only when the order is finalized.


### to do:
1. Add condition, action, displayGroupDiscount, displayGroupDish abstract methods and implementation
2. Check DiscountAdapter.apply(...), DiscountAdapter.checkDiscount(...) DiscountAdapter.add() methods
3. Add discount to Order
