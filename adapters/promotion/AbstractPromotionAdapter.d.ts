import Order, { PromotionState } from "../../models/Order";
import AbstractPromotionHandler from "./AbstractPromotion";
import Group from './../../models/Group';
import Dish from './../../models/Dish';
export default abstract class AbstractPromotionAdapter {
    abstract promotions: {
        [key: string]: AbstractPromotionHandler;
    };
    abstract processOrder(order: Order): Promise<PromotionState[]>;
    abstract displayDish(dish: Dish): Dish;
    abstract displayGroup(group: Group): Group;
    abstract getActivePromotionsIds(): string[];
    /**
     * Base realization clearOfPromotion
     */
    clearOfPromotion(orderId: any): Promise<void>;
    abstract deletePromotion(id: string): void;
    abstract addPromotionHandler(promotionToAdd: AbstractPromotionHandler): Promise<void>;
    abstract getPromotionHandlerById(id: string): AbstractPromotionHandler | undefined;
}
