import Order, { PromotionState } from './../../../models/Order';
import AbstractPromotionHandler from "../../../adapters/promotion/AbstractPromotion";
import { IconfigDiscount } from './../../../interfaces/ConfigDiscount';
import Group from './../../../models/Group';
import Dish from './../../../models/Dish';
export declare class InMemoryDiscountAdapter extends AbstractPromotionHandler {
    id: string;
    isJoint: boolean;
    name: string;
    isPublic: boolean;
    description: string;
    concept: string[];
    configDiscount: IconfigDiscount;
    hash: string;
    externalId: string;
    condition(arg: Group | Dish | Order): boolean;
    action(order: Order): Promise<PromotionState>;
    displayGroup(group: Group, user?: string): Group;
    displayDish(dish: Dish, user?: string): Dish;
}
