import Order, { PromotionState } from "../../../models/Order";
import AbstractPromotionHandler from "../AbstractPromotion";
import AbstractPromotionAdapter from "../AbstractPromotionAdapter";
import Promotion from "../../../models/Promotion";
import Group from "../../../models/Group";
import Dish from "../../../models/Dish";
export declare class PromotionAdapter extends AbstractPromotionAdapter {
    static promotions: {
        [key: string]: AbstractPromotionHandler;
    };
    processOrder(order: Order): Promise<PromotionState[]>;
    displayDish(dish: Dish): Promise<Dish>;
    displayGroup(group: Group): Promise<Group>;
    static filterByConcept(concept: string): Promise<Promotion[]>;
    static filterPromotions(promotionsByConcept: Promotion[], target: Group | Dish | Order): Promise<Promotion[] | undefined>;
    static filterByCondition(promotions: Promotion[], target: Group | Dish | Order): Promise<Promotion[]>;
    addPromotionHandler(promotionToAdd: AbstractPromotionHandler): Promise<void>;
    static recreateConfiguredPromotionHandler(promotionToAdd: Promotion): void;
    static getPromotionHandlerById(id: string): Promise<AbstractPromotionHandler | undefined>;
    getAllConcept(concept: string[]): Promise<AbstractPromotionHandler[]>;
    getActivePromotionsIds(): string[];
    static initialize(initParams?: {
        [key: string]: string | number | boolean;
    }): PromotionAdapter;
}