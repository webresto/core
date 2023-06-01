import Order from "../../models/Order";
export default abstract class AbstractDiscountHandler {
    private static discounts;
    abstract apply(order: Order): Promise<void>;
    abstract clear(): void;
    abstract addDiscountHandler(discountToAdd: AbstractDiscountHandler): Promise<void>;
    abstract getDiscountHandlerById(id: string): Promise<AbstractDiscountHandler | undefined>;
    abstract deleteDiscountHandlerById(id: string): Promise<void>;
    abstract getAllStatic(): Promise<AbstractDiscountHandler[]>;
    abstract getInstance(initParams?: {
        [key: string]: string | number | boolean;
    }): AbstractDiscountHandler;
}
