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
};
export declare class OrderHelper {
    private constructor();
    static initCheckout(populatedOrder: Order): Promise<InitCheckout>;
    static orderHash(populatedOrder: Order): string;
}
