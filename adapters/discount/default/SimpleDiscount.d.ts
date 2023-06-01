import Order from "../../../models/Order";
export declare class SimpleDiscount {
    id: string;
    readonly discount: string;
    readonly action: string;
    readonly discountType: string;
    Condition(order: Order): Promise<boolean>;
    Action(): Promise<void>;
}
