<<<<<<< HEAD
import { WorkTime } from "@webresto/worktime";
=======
import Order from "../../models/Order";
>>>>>>> origin/bonuses
export default abstract class AbstractDiscountHandler {
    /** unique id */
    abstract id: string;
    abstract isJoint: boolean;
    abstract name: string;
    abstract isPublic: boolean;
    abstract enable: boolean;
    abstract isDeleted: boolean;
    abstract description: string;
<<<<<<< HEAD
    abstract concept: string[];
    abstract configDiscount: any;
    abstract discount: string;
    abstract discountType: string;
    abstract actions: string;
    abstract sortOrder: number;
    abstract productCategoryDiscounts: any;
    abstract hash: string;
    abstract worktime?: WorkTime[];
=======
    abstract readonly concept: string[];
    abstract readonly configuredDiscount: {};
    abstract readonly discount: string;
    abstract readonly discountType: string;
    abstract readonly actions: string;
    abstract condition(order: Order): Promise<boolean>;
    abstract action(): Promise<void>;
    abstract displayGroupDiscount(): Promise<void>;
    abstract displayGroupDish(): Promise<void>;
>>>>>>> origin/bonuses
}
