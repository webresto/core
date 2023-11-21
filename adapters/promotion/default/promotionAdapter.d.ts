import Order from "../../../models/Order";
import AbstractPromotionHandler from "../AbstractPromotion";
import AbstractPromotionAdapter from "../AbstractPromotionAdapter";
import Promotion from "../../../models/Promotion";
import Group from "../../../models/Group";
import Dish from "../../../models/Dish";
export declare class PromotionAdapter extends AbstractPromotionAdapter {
    readonly promotions: {
        [key: string]: AbstractPromotionHandler;
    };
    processOrder(populatedOrder: Order): Promise<Order>;
    displayDish(dish: Dish): Dish;
    displayGroup(group: Group): Group;
    filterByConcept(concept: string): Promotion[];
    filterPromotions(promotionsByConcept: Promotion[], target: Group | Dish | Order): Promotion[];
    filterByCondition(promotionsToCheck: Promotion[], target: Group | Dish | Order): Promotion[];
    /**
     * Method uses for puntime call/pass promotionHandler, not configured
     * @param promotionToAdd
     */
    addPromotionHandler(promotionToAdd: AbstractPromotionHandler): Promise<void>;
    /**
     * Method uses for call from Promotion model, afterCreate/update for update configuredPromotion
     * @param promotionToAdd
     * @returns
     */
    recreateConfiguredPromotionHandler(promotionToAdd: Promotion): void;
    getPromotionHandlerById(id: string): AbstractPromotionHandler | undefined;
    deletePromotion(id: string): void;
    /**
     * delete all promotions
     */
    deleteAllPromotions(): void;
    deletePromotionByBadge(badge: string): void;
    getActivePromotionsIds(): string[];
}
