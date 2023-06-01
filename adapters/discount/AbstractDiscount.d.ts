import Order from "../../models/Order";
export default abstract class AbstractDiscount {
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
}
export declare abstract class AbsctractPublicDiscount extends AbstractDiscount {
    isPublic: boolean;
    abstract displayGroupDiscount(): Promise<void>;
    abstract displayGroupDish(): Promise<void>;
}
