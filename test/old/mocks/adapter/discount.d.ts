import AbstractPromotionHandler from "../../../adapters/promotion/AbstractPromotion";
import { IconfigDiscount } from './../../../interfaces/ConfigDiscount';
import { GroupRecord } from "../../../models/Group";
import { DishRecord } from "../../../models/Dish";
import { OrderRecord, PromotionState } from "../../../models/Order";
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
    condition(arg: GroupRecord | DishRecord | OrderRecord): boolean;
    action(order: OrderRecord): Promise<PromotionState>;
    displayGroup(group: GroupRecord, user?: string): GroupRecord;
    displayDish(dish: DishRecord, user?: string): DishRecord;
}
