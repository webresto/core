import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";
import { OptionalAll } from "../interfaces/toolsTS";
import { OrderRecord } from "./Order";
import { UserRecord } from "./User";
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
    order: OrderRecord;
    /** Total discount amount*/
    discountTotal: number;
    /** Comment to dish in order */
    comment: string;
    /** Gross weight */
    totalWeight: number;
    user: UserRecord | string;
};
type attributes = typeof attributes;
export interface UserOrderHistoryRecord extends OptionalAll<attributes>, ORM {
}
declare let Model: {
    save(orderId: string): Promise<void>;
};
declare global {
    const UserOrderHistory: typeof Model & ORMModel<UserOrderHistoryRecord, "id" | "uniqueItems" | "orderTotal" | "total" | "totalWeight" | "order" | "user">;
}
export {};
