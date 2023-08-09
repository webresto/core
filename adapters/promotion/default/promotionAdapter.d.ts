import Order from "../../../models/Order";
import AbstractPromotionHandler from "../AbstractPromotion";
import AbstractPromotionAdapter from "../AbstractPromotionAdapter";
import { IconfigDiscount } from "../../../interfaces/ConfigDiscount";
import Promotion from "../../../models/Promotion";
import Group from "../../../models/Group";
import Dish from "../../../models/Dish";
export declare class PromotionAdapter extends AbstractPromotionAdapter {
    static promotions: {
        [key: string]: AbstractPromotionHandler;
    };
    processOrder(order: Order): Promise<void>;
    displayDish(dish: Dish): Promise<AbstractPromotionHandler | undefined>;
    displayGroup(group: Group): Promise<AbstractPromotionHandler | undefined>;
    static filterByConcept(concept: string): Promise<Promotion[]>;
    static filterPromotions(promotionsByConcept: Promotion[], target: Group | Dish | Order): Promise<Promotion[] | undefined>;
    static filterByCondition(promotions: Promotion[], target: Group | Dish | Order): Promise<Promotion[]>;
    addPromotionHandler(promotionToAdd: AbstractPromotionHandler): Promise<void>;
    static recreatePromotionHandler(promotionToAdd: AbstractPromotionHandler): Promise<void>;
    static getPromotionHandlerById(id: string): Promise<AbstractPromotionHandler | undefined>;
    getAllConcept(concept: string[]): Promise<AbstractPromotionHandler[]>;
    getActivePromotionsIds(): string[];
    static clearOfPromotion(orderId: any): Promise<void>;
    static applyPromotion(orderId: any, spendDiscount: IconfigDiscount, promotionId: any): Promise<void>;
    static initialize(initParams?: {
        [key: string]: string | number | boolean;
    }): PromotionAdapter;
}
