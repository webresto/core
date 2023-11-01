import Order, { PromotionState } from "../../models/Order";
import AbstractPromotionHandler from "./AbstractPromotion";
import Group from './../../models/Group';
import Dish from './../../models/Dish';
import { IconfigDiscount } from './../../interfaces/ConfigDiscount';
export default abstract class AbstractPromotionAdapter {
    abstract promotions: {
        [key: string]: AbstractPromotionHandler;
    };
    abstract processOrder(order: Order): Promise<PromotionState[]>;
    abstract displayDish(dish: Dish): Dish;
    abstract displayGroup(group: Group): Group;
    abstract recreatePromotionHandler(promotionToAdd: AbstractPromotionHandler): void;
    abstract getActivePromotionsIds(): string[];
    /**
     * Base realization clearOfPromotion
     */
    clearOfPromotion(orderId: any): Promise<void>;
    abstract applyPromotion(orderId: any, spendPromotion: IconfigDiscount, promotionId: any): Promise<PromotionState>;
    abstract deletePromotion(id: string): void;
    abstract addPromotionHandler(promotionToAdd: AbstractPromotionHandler): Promise<void>;
    abstract getPromotionHandlerById(id: string): AbstractPromotionHandler | undefined;
}
