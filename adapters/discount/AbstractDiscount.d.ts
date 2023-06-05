import Order from "../../models/Order";
export default abstract class AbstractDiscountHandler {
    /** unique id */
    abstract id: string;
    abstract isJoint: boolean;
    abstract name: string;
    abstract isPublic: boolean;
    abstract description: string;
    abstract readonly concept: string[];
    abstract readonly configuredDiscount: {};
    abstract readonly discount: string;
    abstract readonly discountType: string;
    abstract readonly actions: string;
    abstract condition(order: Order): Promise<boolean>;
    abstract action(): Promise<void>;
    abstract displayGroupDiscount(): Promise<void>;
    abstract displayGroupDish(): Promise<void>;
}
