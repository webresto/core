import Order from "../../models/Order"

export default abstract class AbstractDiscountHandler {
    /** unique id */
    public abstract id: string

    public abstract isJoint: boolean

    public abstract name: string

    public abstract isPublic: boolean

    public abstract description: string

    public abstract readonly concept: string[];

    public abstract readonly configuredDiscount: {}

    public abstract readonly discount: string;

    public abstract readonly discountType: string;

    public abstract readonly actions: string;

    public abstract condition(order: Order): Promise<boolean>;

    public abstract action(): Promise<void>;

    public abstract displayGroupDiscount(): Promise<void>;

    public abstract displayGroupDish(): Promise<void>;
}
