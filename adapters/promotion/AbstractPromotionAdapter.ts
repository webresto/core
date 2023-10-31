import Order, { PromotionState } from "../../models/Order"
import AbstractPromotionHandler from "./AbstractPromotion";
import Group from './../../models/Group';
import Dish from './../../models/Dish';
import Promotion from './../../models/Promotion';
import { IconfigDiscount } from './../../interfaces/ConfigDiscount';

export default abstract class AbstractPromotionAdapter {
        public abstract promotions: { [key: string]: AbstractPromotionHandler};

        public abstract processOrder(order: Order): Promise<PromotionState[]>
        public abstract displayDish(dish: Dish): Dish;
        public abstract displayGroup(group: Group): Group;

        public abstract recreatePromotionHandler(promotionToAdd: AbstractPromotionHandler): void;

        public abstract getActivePromotionsIds(): string[];

        /**
         * Base realization clearOfPromotion
         */
        public async clearOfPromotion(orderId) {
            const order = await Order.findOne({ id: orderId });
            // if Order.status ="PAYMENT" or "ORDER" can't clear promotions
            if (order.state === "ORDER") throw "order with orderId " + order.id + "in state ORDER";
            if (order.state === "PAYMENT") throw "order with orderId " + order.id + "in state PAYMENT";
        
            // ------------------------------------------ OrderDish update ------------------------------------------
            
            const orderDishes = await OrderDish.find({ order: order.id }).populate("dish");
            for (const orderDish of orderDishes) {
              await OrderDish.update({ id: orderDish.id }, { discountTotal: 0, discountType: "" }).fetch();
            }
            await Order.updateOne({ id: order.id }, { discountTotal: 0}) // isPromoting: false
        }

        public abstract applyPromotion (orderId: any, spendPromotion: IconfigDiscount, promotionId: any): Promise<PromotionState>;
        
        public abstract deletePromotion(id:string): void

        public abstract addPromotionHandler(promotionToAdd: AbstractPromotionHandler): Promise<void>;

        public abstract getPromotionHandlerById(id: string): AbstractPromotionHandler | undefined;

        static getInstance:(initParams?: {
            [key: string]: string | number | boolean;
        })=> AbstractPromotionAdapter;
}
