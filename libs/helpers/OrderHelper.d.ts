import { OrderRecord } from "../../models/Order";
export type InitCheckout = {
    /** Order nonce */
    nonce: number;
    /**
     * Intervals during which an order can be placed
     * */
    worktimeIntervals: [number, number][];
    /**
     * Will it be possible to order as quickly as possible?
     */
    allowSoonAsPossible: boolean;
    /**
     * Allow order by time
     */
    allowOrderToTime: boolean;
    /**
     * Above the expenditure of bonuses on a check of a piece that will be shown to the user
     */
    bonusBannerHTMLChunk: string;
    /**
     *  the minimum time required to cook the dish. This value is added to the minimum delivery time to calculate the earliest possible time the order can be ready.
     */
    minCookingTimeInMinutes: number;
    /**
     * Optional textual description of cooking time (e.g. "Prepared in 15–20 minutes").
     * Useful for displaying estimated preparation time to customers.
     */
    cookingTimeDescription?: string;
};
export declare class OrderHelper {
    private constructor();
    static initCheckout(populatedOrder: OrderRecord): Promise<InitCheckout>;
    static orderHash(populatedOrder: OrderRecord): string;
}
