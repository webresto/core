import AbstractPromotionHandler from "../AbstractPromotion";
import { IconfigDiscount } from "../../../interfaces/ConfigDiscount";
import { GroupRecord } from "../../../models/Group";
import { DishRecord } from "../../../models/Dish";
import { OrderRecord, PromotionState } from "../../../models/Order";
import { UserRecord } from "../../../models/User";
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
    condition(arg: GroupRecord | DishRecord | OrderRecord): boolean;
    action(order: OrderRecord): Promise<PromotionState>;
    displayGroup(group: GroupRecord, user?: string | UserRecord): GroupRecord;
    displayDish(dish: DishRecord, user?: string | UserRecord): DishRecord;
    applyPromotion(order: OrderRecord): Promise<PromotionState>;
}
