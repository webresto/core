import ORM from "../interfaces/ORM";
import ORMModel from "../interfaces/ORMModel";
import Order from "../models/Order";
import { OptionalAll } from "../interfaces/toolsTS";
import User from "../models/User";
declare let attributes: {
    /** ID */
    id: string;
    /** Number of unique dishes in the cart */
    uniqueItems: number;
    /** Total cost of the order */
    orderTotal: number;
    /** total cost */
    total: number;
    /** Baked json object of fullOrder */
    order: Order;
    /** Total discount amount*/
    discountTotal: number;
    /** Comment to dish in order */
    comment: string;
    /** Gross weight */
    totalWeight: number;
    user: String | User;
};
type attributes = typeof attributes;
interface UserOrderHistory extends OptionalAll<attributes>, ORM {
}
export default UserOrderHistory;
declare let Model: {
    save(orderId: string): Promise<void>;
};
declare global {
    const UserOrderHistory: typeof Model & ORMModel<UserOrderHistory, "id" | "uniqueItems" | "orderTotal" | "total" | "totalWeight" | "order" | "user">;
}
