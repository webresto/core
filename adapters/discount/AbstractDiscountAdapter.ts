import Order from "../../models/Order"
import AbstractDiscountHandler from "./AbstractDiscount";

export default abstract class AbstractDiscountHandlerINSTANCE {

        private static discounts;

        public abstract apply(order: Order): Promise<void>;

        public abstract clear(): void;

        public abstract addDiscountHandler(discountToAdd: AbstractDiscountHandler): Promise<void>;

        public abstract getDiscountHandlerById(id: string): Promise<AbstractDiscountHandler | undefined>;

        public abstract deleteDiscountHandlerById(id: string): Promise<void>;

        public abstract getAllStatic(): Promise<AbstractDiscountHandler[]>;

        public abstract getInstance(initParams?: {
            [key: string]: string | number | boolean;
        }): AbstractDiscountHandlerINSTANCE;
}
