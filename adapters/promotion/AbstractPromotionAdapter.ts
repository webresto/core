import Order from "../../models/Order"
import AbstractPromotionHandler from "./AbstractPromotion";
// import Group  from '@webresto/core/models/Group';
// import Dish  from '@webresto/core/models/Dish';
// import { IconfigDiscount } from "@webresto/core/interfaces/ConfigDiscount";
// import { PromotionAdapter } from "@webresto/core/adapters/discount/default/promotionAdapter";
// import  Promotion  from '@webresto/core/models/Promotion';
import Group from './../../models/Group';
import Dish from './../../models/Dish';
import Promotion from './../../models/Promotion';
import { IconfigDiscount } from './../../interfaces/ConfigDiscount';
import { PromotionAdapter } from "./default/promotionAdapter";

export default abstract class AbstractPromotionHandlerINSTANCE {
        static promotions: { [key: string]: AbstractPromotionHandler};

        public abstract processOrder(order: Order): Promise<void>;
        public abstract displayDish(dish: Dish): Promise<AbstractPromotionHandler | undefined>;
        public abstract displayGroup(group: Group): Promise<AbstractPromotionHandler | undefined>;

        public static filterByConcept:(concept: string) => Promise<Promotion[]>;
        public static filterPromotions:(promotionsByConcept: Promotion[], target: Group | Dish | Order) => Promise<Promotion[] | undefined>;
        public static filterByCondition:(promotions: Promotion[], target: Group | Dish | Order)=> Promise<Promotion[]>;

        public static recreatePromotionHandler:(promotionToAdd: AbstractPromotionHandler) => Promise<void>;

        public static getAllConcept:(concept: string[]) => Promise<AbstractPromotionHandler[]>;

        public abstract getActivePromotionsIds(): string[];
        public static clearOfPromotion:(orderId: any) => Promise<void>;
        public static applyPromotion: (orderId: any, spendPromotion: IconfigDiscount, promotionId: any) => Promise<void>;
        public static initialize:(initParams?: {
            [key: string]: string | number | boolean;
        }) => PromotionAdapter;
        
        public abstract addPromotionHandler(promotionToAdd: AbstractPromotionHandler): Promise<void>;

        public static  getPromotionHandlerById:(id: string) => Promise<AbstractPromotionHandler | undefined>;

        static getInstance:(initParams?: {
            [key: string]: string | number | boolean;
        })=> AbstractPromotionHandlerINSTANCE;
}
