import ORM from "../interfaces/ORM";
import {ORMModel} from "../interfaces/ORMModel";
import Order from "../models/Order";
import { OptionalAll } from "../interfaces/toolsTS";
import User from "../models/User"
import { v4 as uuid } from "uuid";

let attributes = {

  /** ID */
  id: {
    type: "string",
    //required: true,
  } as unknown as string,

  /** Number of unique dishes in the cart */
  uniqueItems: "number" as unknown as number,

  /** Total cost of the order */
  orderTotal: "number" as unknown as number,

  /** total cost */
  total: "number" as unknown as number,

  /** Baked json object of fullOrder */
  order: "json" as unknown as Order,

  /** Total discount amount*/
  discountTotal: "number" as unknown as number,

  /** Comment to dish in order */
  comment: "string",

  /** Gross weight */
  totalWeight: "number" as unknown as number,

  user: {
    model: 'user',
  } as unknown as User | String,
};

type attributes = typeof attributes;
interface UserOrderHistory extends OptionalAll<attributes>, ORM {}
export default UserOrderHistory;

let Model = {
  async save(orderId: string): Promise<void> {
    let order = await Order.populate({id: orderId});
    if (!order) throw 'no order for save'
    if (!order.user) throw 'No user for save order'
    let user = await User.findOne({id: order.user as string})
    if (user && user.id) {
      await UserOrderHistory.create({
        id: uuid(),
        order: order,
        orderTotal: order.orderTotal,
        uniqueItems: order.uniqueDishes,
        total: order.total,
        totalWeight: order.totalWeight,
        user: user.id
      }).fetch();
    }

    // Count orders
    let count = await UserOrderHistory.find({user: user.id})
    await User.update({id: user.id}, {orderCount: count.length});
  }
};

module.exports = {
  primaryKey: "id",
  attributes: attributes,
  ...Model,
};

declare global {
  const UserOrderHistory: typeof Model & ORMModel<UserOrderHistory, "id" | "uniqueItems" | "orderTotal"  | "total" | "totalWeight" | "order" | "user" >;
}
