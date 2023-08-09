import Order from "../../models/Order";
import AbstractPromotionHandler from "./AbstractPromotion";
import Group from './../../models/Group';
import Dish from './../../models/Dish';
import Promotion from './../../models/Promotion';
import { IconfigDiscount } from './../../interfaces/ConfigDiscount';
import { PromotionAdapter } from "./default/promotionAdapter";
export default abstract class AbstractPromotionAdapter {
    static promotions: {
        [key: string]: AbstractPromotionHandler;
    };
    abstract processOrder(order: Order): Promise<void>;
    abstract displayDish(dish: Dish): Promise<AbstractPromotionHandler | undefined>;
    abstract displayGroup(group: Group): Promise<AbstractPromotionHandler | undefined>;
    static filterByConcept: (concept: string) => Promise<Promotion[]>;
    static filterPromotions: (promotionsByConcept: Promotion[], target: Group | Dish | Order) => Promise<Promotion[] | undefined>;
    static filterByCondition: (promotions: Promotion[], target: Group | Dish | Order) => Promise<Promotion[]>;
    static recreatePromotionHandler: (promotionToAdd: AbstractPromotionHandler) => Promise<void>;
    static getAllConcept: (concept: string[]) => Promise<AbstractPromotionHandler[]>;
    abstract getActivePromotionsIds(): string[];
    static clearOfPromotion(orderId: any): Promise<void>;
    static applyPromotion: (orderId: any, spendPromotion: IconfigDiscount, promotionId: any) => Promise<void>;
    static initialize: (initParams?: {
        [key: string]: string | number | boolean;
    }) => PromotionAdapter;
    abstract addPromotionHandler(promotionToAdd: AbstractPromotionHandler): Promise<void>;
    static getPromotionHandlerById: (id: string) => Promise<AbstractPromotionHandler | undefined>;
    static getInstance: (initParams?: {
        [key: string]: string | number | boolean;
    }) => AbstractPromotionAdapter;
}
