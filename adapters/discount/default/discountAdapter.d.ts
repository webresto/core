import Order from "../../../models/Order";
import AbstractDiscountHandler from "../AbstractDiscount";
export declare class DiscountAdapter {
    private static discounts;
    static apply(order: Order): Promise<void>;
    static checkDiscount(order: Order, modelDiscounts: AbstractDiscountHandler[]): Promise<void>;
    static clear(): void;
    static addDiscountHandler(discountToAdd: AbstractDiscountHandler): Promise<void>;
    private static getDiscountHandlerById;
    static getInstance(initParams?: {
        [key: string]: string | number | boolean;
    }): DiscountAdapter;
}
