import Order, { PromotionState } from "../../models/Order"
import AbstractPromotionHandler from "./AbstractPromotion";
import Group from './../../models/Group';
import Dish from './../../models/Dish';
import { IconfigDiscount } from './../../interfaces/ConfigDiscount';

export default abstract class AbstractPromotionAdapter {
        public abstract promotions: { [key: string]: AbstractPromotionHandler};

        public abstract processOrder(order: Order): Promise<Order>
        public abstract displayDish(dish: Dish): Dish;
        public abstract displayGroup(group: Group): Group;
        public abstract getActivePromotionsIds(): string[];

        /**
         * Base realization clearOfPromotion
         * the order attribute will be changed during method execution
         * 
         * This is in an abstract class because it's essentially part of the core, but you can rewrite it
         */
        public async clearOfPromotion(order: Order): Promise<Order> {
            // if Order.status ="PAYMENT" or "ORDER" can't clear promotions
            if (order.state === "ORDER") throw "order with orderId " + order.id + "in state ORDER";
            if (order.state === "PAYMENT") throw "order with orderId " + order.id + "in state PAYMENT";
        
            // const orderDishes = await OrderDish.find({ order: order.id }).populate("dish");            
            // console.log("ADDDED BY PROMOTION => delete")

            await OrderDish.destroy({ order: order.id, addedBy: "promotion"}).fetch();
            await OrderDish.update({ order: order.id, addedBy: "user" }, { discountTotal: 0, discountType: "" }).fetch();
            await Order.updateOne({ id: order.id }, { discountTotal: 0, promotionFlatDiscount: 0}) // isPromoting: false
            
            // for return populated order
            order.discountTotal = 0;
            order.promotionFlatDiscount = 0;
            return order
        }
                
        public abstract deletePromotion(id:string): void

        public abstract addPromotionHandler(promotionToAdd: AbstractPromotionHandler): Promise<void>;

        public abstract getPromotionHandlerById(id: string): AbstractPromotionHandler | undefined;
}
