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
};
export declare class OrderHelper {
    private constructor();
    static initCheckout(populatedOrder: OrderRecord): Promise<InitCheckout>;
    static orderHash(populatedOrder: OrderRecord): string;
}
