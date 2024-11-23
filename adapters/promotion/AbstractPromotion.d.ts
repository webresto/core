import { IconfigDiscount } from "../../interfaces/ConfigDiscount";
import { DishRecord } from "../../models/Dish";
import { GroupRecord } from "../../models/Group";
import { OrderRecord, PromotionState } from "../../models/Order";
import { UserRecord } from "../../models/User";
export default abstract class AbstractPromotionHandler {
    /** unique id */
    abstract id: string;
    abstract isJoint: boolean;
    abstract name: string;
    abstract isPublic: boolean;
    abstract description?: string;
    configDiscount?: IconfigDiscount;
    abstract concept: string[];
    abstract externalId?: string;
    /**
     * For delete by badge
     */
    abstract badge: string;
    abstract condition(arg1: GroupRecord | DishRecord | OrderRecord): boolean;
    /**
     * The order must be modified and recorded in a model within this method
     * @param order Order should populated order
     */
    abstract action(order: OrderRecord): Promise<PromotionState>;
    /**
     * If isPublic === true displayGroup is required
     */
    abstract displayGroup?(group: GroupRecord, user?: string | UserRecord): GroupRecord;
    /**
     * If isPublic === true displayDish is required
     */
    abstract displayDish?(dish: DishRecord, user?: string | UserRecord): DishRecord;
}
