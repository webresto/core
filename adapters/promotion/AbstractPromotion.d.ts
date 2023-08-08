import { IconfigDiscount } from "../../interfaces/ConfigDiscount";
import Order from "../../models/Order";
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
    abstract configDiscount?: IconfigDiscount;
    abstract concept: string[];
    abstract externalId?: string;
    abstract condition?(arg1: Group | Dish | Order): boolean;
    abstract action?(order: Order): Promise<void>;
    abstract displayGroup?(group: Group, user?: string | User): Promise<Group[]>;
    abstract displayDish?(dish: Dish, user?: string | User): Promise<Dish[]>;
}
