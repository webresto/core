import AbstractPromotionHandler from "../AbstractPromotion";
import { IconfigDiscount } from "../../../interfaces/ConfigDiscount";
export default class ConfiguredPromotion extends AbstractPromotionHandler {
    badge: string;
    constructor(promotion: Omit<AbstractPromotionHandler, "action" | "condition">, config?: IconfigDiscount);
    private config;
    id: string;
    isJoint: boolean;
    name: string;
    isPublic: boolean;
    description: string;
    concept: string[];
    externalId: string;
    condition(arg: Group | Dish | Order): boolean;
    action(order: Order): Promise<PromotionState>;
    displayGroup(group: Group, user?: string | User): Group;
    displayDish(dish: Dish, user?: string | User): Dish;
    applyPromotion(order: Order): Promise<PromotionState>;
}
