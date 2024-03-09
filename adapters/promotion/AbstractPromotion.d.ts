import { IconfigDiscount } from "../../interfaces/ConfigDiscount";
import Order, { PromotionState } from "../../models/Order";
import User from "../../models/User";
import Group from "../../models/Group";
import Dish from "../../models/Dish";
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
    abstract condition(arg1: Group | Dish | Order): boolean;
    /**
     * The order must be modified and recorded in a model within this method
     * @param order Order should populated order
     */
    abstract action(order: Order): Promise<PromotionState>;
    /**
     * If isPublic === true displayGroup is required
     */
    abstract displayGroup?(group: Group, user?: string | User): Group;
    /**
     * If isPublic === true displayDish is required
     */
    abstract displayDish?(dish: Dish, user?: string | User): Dish;
}
