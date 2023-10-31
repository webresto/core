import Order, { PromotionState } from "../../../models/Order";
import AbstractPromotionHandler from "../AbstractPromotion";
import AbstractPromotionAdapter from "../AbstractPromotionAdapter";
import { IconfigDiscount } from "../../../interfaces/ConfigDiscount";
import Promotion from "../../../models/Promotion";
import Group from "../../../models/Group";
import Dish from "../../../models/Dish";
export declare class PromotionAdapter extends AbstractPromotionAdapter {
    recreatePromotionHandler(promotionToAdd: AbstractPromotionHandler): void;
    applyPromotion(orderId: any, spendPromotion: IconfigDiscount, promotionId: any): Promise<PromotionState>;
    promotions: {
        [key: string]: AbstractPromotionHandler;
    };
    processOrder(order: Order): Promise<PromotionState[]>;
    displayDish(dish: Dish): Dish;
    displayGroup(group: Group): Group;
    filterByConcept(concept: string): Promotion[];
    filterPromotions(promotionsByConcept: Promotion[], target: Group | Dish | Order): Promotion[];
    filterByCondition(promotions: Promotion[], target: Group | Dish | Order): Promotion[];
    addPromotionHandler(promotionToAdd: AbstractPromotionHandler): Promise<void>;
    recreateConfiguredPromotionHandler(promotionToAdd: Promotion): void;
    getPromotionHandlerById(id: string): AbstractPromotionHandler | undefined;
    getAllConcept(concept: string[]): Promise<AbstractPromotionHandler[]>;
    deletePromotion(id: string): void;
    getActivePromotionsIds(): string[];
}
