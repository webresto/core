import Order from "../../models/Order"
import { WorkTime } from "@webresto/worktime";

export default abstract class AbstractDiscountHandler {
    /** unique id */
    public abstract id: string

    public abstract isJoint: boolean

    public abstract name: string

    public abstract isPublic: boolean

    public abstract enable: boolean;

    public abstract isDeleted: boolean;

    public abstract description: string

    public abstract concept: string[];

    public abstract configDiscount: any

    public abstract discount: string;

    public abstract discountType: string;

    public abstract actions: string;

    public abstract sortOrder: number;

    public abstract productCategoryDiscounts: any;

    public abstract hash: string;

    public abstract worktime?: WorkTime[];

    // public abstract condition(order: Order): Promise<boolean>;

    // public abstract action(): Promise<void>;

    // public abstract displayGroupDiscount(): Promise<void>;

    // public abstract displayGroupDish(): Promise<void>;
}
