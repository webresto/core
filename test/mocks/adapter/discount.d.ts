import AbstractPromotionHandler from "../../../adapters/promotion/AbstractPromotion";
import { IconfigDiscount } from './../../../interfaces/ConfigDiscount';
export declare class InMemoryDiscountAdapter extends AbstractPromotionHandler {
    id: string;
    isJoint: boolean;
    name: string;
    isPublic: boolean;
    badge: string;
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
