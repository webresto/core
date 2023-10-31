import Order, { PromotionState } from "../../models/Order";
import AbstractPromotionHandler from "./AbstractPromotion";
import Group from './../../models/Group';
import Dish from './../../models/Dish';
import Promotion from './../../models/Promotion';
import { IconfigDiscount } from './../../interfaces/ConfigDiscount';
import { PromotionAdapter } from "./default/promotionAdapter";
export default abstract class AbstractPromotionAdapter {
    abstract promotions: {
        [key: string]: AbstractPromotionHandler;
    };
    abstract processOrder(order: Order): Promise<PromotionState[]>;
    abstract displayDish(dish: Dish): Dish;
    abstract displayGroup(group: Group): Group;
    abstract filterByConcept(concept: string): Promotion[];
    abstract filterPromotions(promotionsByConcept: Promotion[], target: Group | Dish | Order): Promotion[];
    abstract filterByCondition(promotions: Promotion[], target: Group | Dish | Order): Promotion[];
    abstract recreatePromotionHandler(promotionToAdd: AbstractPromotionHandler): void;
    abstract getAllConcept(concept: string[]): Promise<AbstractPromotionHandler[]>;
    abstract getActivePromotionsIds(): string[];
    /**
     * Base realization clearOfPromotion
     */
    clearOfPromotion(orderId: any): Promise<void>;
    abstract applyPromotion(orderId: any, spendPromotion: IconfigDiscount, promotionId: any): Promise<PromotionState>;
    abstract initialize(initParams?: {
        [key: string]: string | number | boolean;
    }): PromotionAdapter;
    abstract deletePromotion: (id: string) => void;
    abstract addPromotionHandler(promotionToAdd: AbstractPromotionHandler): Promise<void>;
    abstract getPromotionHandlerById: (id: string) => Promise<AbstractPromotionHandler | undefined>;
    static getInstance: (initParams?: {
        [key: string]: string | number | boolean;
    }) => AbstractPromotionAdapter;
}
