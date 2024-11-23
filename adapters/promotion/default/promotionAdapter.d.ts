import AbstractPromotionHandler from "../AbstractPromotion";
import AbstractPromotionAdapter from "../AbstractPromotionAdapter";
import { OrderRecord } from "../../../models/Order";
import { PromotionRecord } from "../../../models/Promotion";
import { DishRecord } from "../../../models/Dish";
import { GroupRecord } from "../../../models/Group";
export declare class PromotionAdapter extends AbstractPromotionAdapter {
    readonly promotions: {
        [key: string]: AbstractPromotionHandler;
    };
    processOrder(populatedOrder: OrderRecord): Promise<OrderRecord>;
    displayDish(dish: DishRecord): DishRecord;
    displayGroup(group: GroupRecord): GroupRecord;
    filterByConcept(concept: string | string[]): PromotionRecord[];
    filterPromotions(promotionsByConcept: PromotionRecord[], target: GroupRecord | DishRecord | OrderRecord): PromotionRecord[];
    filterByCondition(promotionsToCheck: PromotionRecord[], target: GroupRecord | DishRecord | OrderRecord): PromotionRecord[];
    /**
     * Method uses for runtime call/pass promotionHandler, not configured
     * @param promotionToAdd
     */
    addPromotionHandler(promotionToAdd: AbstractPromotionHandler): Promise<void>;
    /**
     * Method uses for call from Promotion model, afterCreate/update for update configuredPromotion
     * @param promotionToAdd
     * @returns
     */
    recreateConfiguredPromotionHandler(promotionToAdd: PromotionRecord): void;
    getPromotionHandlerById(id: string): AbstractPromotionHandler | undefined;
    deletePromotion(id: string): void;
    /**
     * delete all promotions
     */
    deleteAllPromotions(): void;
    deletePromotionByBadge(badge: string): void;
    getActivePromotionsIds(): string[];
}
