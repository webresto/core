import Order, { PromotionState } from "../../models/Order"
import AbstractPromotionHandler from "./AbstractPromotion";
import Group from './../../models/Group';
import Dish from './../../models/Dish';
import Promotion from './../../models/Promotion';
import { IconfigDiscount } from './../../interfaces/ConfigDiscount';
import { PromotionAdapter } from "./default/promotionAdapter";

export default abstract class AbstractPromotionAdapter {
        static promotions: { [key: string]: AbstractPromotionHandler};

        public abstract processOrder(order: Order): Promise<PromotionState[]>
        public abstract displayDish(dish: Dish): Promise<AbstractPromotionHandler | undefined>;
        public abstract displayGroup(group: Group): Promise<AbstractPromotionHandler | undefined>;

        public static filterByConcept:(concept: string) => Promise<Promotion[]>;
        public static filterPromotions:(promotionsByConcept: Promotion[], target: Group | Dish | Order) => Promise<Promotion[] | undefined>;
        public static filterByCondition:(promotions: Promotion[], target: Group | Dish | Order)=> Promise<Promotion[]>;

        public static recreatePromotionHandler:(promotionToAdd: AbstractPromotionHandler) => Promise<void>;

        public static getAllConcept:(concept: string[]) => Promise<AbstractPromotionHandler[]>;

        public abstract getActivePromotionsIds(): string[];
        // public static clearOfPromotion:(orderId: any) => Promise<void>;

        public static async clearOfPromotion(orderId) {
            const order = await Order.findOne({ id: orderId });
            // if Order.status ="PAYMENT" or "ORDER" can't clear promotions
            if (order.state === "ORDER") throw "order with orderId " + order.id + "in state ORDER";
            if (order.state === "PAYMENT") throw "order with orderId " + order.id + "in state PAYMENT";
        
            // ------------------------------------------ OrderDish update ------------------------------------------
            
            const orderDishes = await OrderDish.find({ order: order.id }).populate("dish");
            for (const orderDish of orderDishes) {
              await OrderDish.update({ id: orderDish.id }, { discountTotal: 0, discountType: "" }).fetch();
            }
        
            await Order.updateOne({ id: order.id }, { discountTotal: 0}) // isPromoted: false
        }

        public static applyPromotion: (orderId: any, spendPromotion: IconfigDiscount, promotionId: any) => Promise<void>;
        public static initialize:(initParams?: {
            [key: string]: string | number | boolean;
        }) => PromotionAdapter;
        
        public abstract addPromotionHandler(promotionToAdd: AbstractPromotionHandler): Promise<void>;

        public static  getPromotionHandlerById:(id: string) => Promise<AbstractPromotionHandler | undefined>;

        static getInstance:(initParams?: {
            [key: string]: string | number | boolean;
        })=> AbstractPromotionAdapter;
}
