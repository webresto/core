import { OrderModifier } from "../interfaces/Modifier";
import Address from "../interfaces/Address";
import Customer from "../interfaces/Customer";
import OrderDish from "./OrderDish";
import PaymentDocument from "./PaymentDocument";
import ORMModel, { CriteriaQuery } from "../interfaces/ORMModel";
import ORM from "../interfaces/ORM";
import StateFlowModel from "../interfaces/StateFlowModel";
import Dish from "./Dish";
import User from "./User";
import { PaymentResponse } from "../interfaces/Payment";
import { OptionalAll } from "../interfaces/toolsTS";
<<<<<<< HEAD
import { OrderBonuses } from "../interfaces/OrderBonuses";
=======
import { SpendBonus } from "../interfaces/SpendBonus";
>>>>>>> origin/bonuses
declare let attributes: {
    /** Id  */
    id: string;
    /** last 8 chars from id */
    shortId: string;
<<<<<<< HEAD
    /**  Concept string */
=======
    /** Concept string */
>>>>>>> origin/bonuses
    concept: string;
    /** the basket contains mixed types of concepts */
    isMixedConcept: boolean;
    /** */
    dishes: number[] | OrderDish[];
    paymentMethod: any;
    /** */
    paymentMethodTitle: string;
    paid: boolean;
    /** */
    isPaymentPromise: boolean;
    /** */
    dishesCount: number;
    uniqueDishes: number;
    modifiers: any;
    customer: any;
    address: any;
    comment: string;
    personsCount: string;
    /** The desired date and delivery time*/
    date: string;
    problem: boolean;
    /** */
    rmsDelivered: boolean;
    /** */
    rmsId: string;
    rmsOrderNumber: string;
    rmsOrderData: any;
    rmsDeliveryDate: string;
    rmsErrorMessage: string;
    rmsErrorCode: string;
    rmsStatusCode: string;
    deliveryStatus: string;
    selfService: boolean;
    deliveryDescription: string;
    message: string;
    deliveryItem: string | Dish;
    deliveryCost: number;
    /** order total weight */
    totalWeight: number;
    /** Сдача */
    trifleFrom: number;
    /** Summ of all bobnuses */
    bonusesTotal: number;
<<<<<<< HEAD
=======
    spendBonus: SpendBonus;
>>>>>>> origin/bonuses
    /** total = basketTotal + deliveryCost - discountTotal - bonusesTotal */
    total: number;
    /**
      * Sum dishes user added
      */
    basketTotal: number;
    /**
    *   @deprecated orderTotal use basketTotal
    */
    orderTotal: number;
    discountTotal: number;
    orderDate: string;
    deviceId: string;
    user: string | User;
    customData: any;
};
interface stateFlowInstance {
    state: string;
}
type attributes = typeof attributes & stateFlowInstance;
interface Order extends ORM, OptionalAll<attributes> {
}
export default Order;
declare let Model: {
    beforeCreate(orderInit: any, cb: (err?: string) => void): void;
    /** Add dish into order */
    addDish(criteria: CriteriaQuery<Order>, dish: Dish | string, amount: number, modifiers: OrderModifier[], comment: string, addedBy: string, replace?: boolean, orderDishId?: number): Promise<void>;
    removeDish(criteria: CriteriaQuery<Order>, dish: OrderDish, amount: number, stack?: boolean): Promise<void>;
    setCount(criteria: CriteriaQuery<Order>, dish: OrderDish, amount: number): Promise<void>;
    setComment(criteria: CriteriaQuery<Order>, dish: OrderDish, comment: string): Promise<void>;
    /**
     * Clone dishes in new order
     * @param source Order findOne criteria
     * @returns new order
     */
    clone(source: CriteriaQuery<Order>): Promise<Order>;
    /**
     * Set order selfService field. Use this method to change selfService.
     * @param selfService
     */
    setSelfService(criteria: CriteriaQuery<Order>, selfService?: boolean): Promise<Order>;
    /**
<<<<<<< HEAD
=======
     * !! Not for external use, only in Order.check
>>>>>>> origin/bonuses
     * The use of bonuses in the cart implies that this order has a user.
     * Then all checks will be made and a record will be written in the transaction of user bonuses
     *
     Bonus spending strategies :
<<<<<<< HEAD
      1) bonus_from_order_total: (default) deduction from the final amount of the order including promotional dishes, discounts and delivery
      2) bonus_from_basket_delivery_discount: writing off bonuses from the amount of the basket, delivery and discounts (not including promotional dishes)
      3) bonus_from_basket_and_delivery: writing off bonuses from the amount of the basket and delivery (not including promotional dishes, discounts)
      4) bonus_from_basket: write-off of bonuses from the amount of the basket (not including promotional dishes, discounts and delivery)
  
     */
    applyBonuses(orderId: any, orderBonuses: OrderBonuses): Promise<void>;
    check(criteria: CriteriaQuery<Order>, customer?: Customer, isSelfService?: boolean, address?: Address, paymentMethodId?: string): Promise<void>;
    /** Оформление корзины */
    order(criteria: CriteriaQuery<Order>): Promise<number>;
=======
      1) 'bonus_from_order_total': (default) deduction from the final amount of the order including promotional dishes, discounts and delivery
      2) 'bonus_from_basket_delivery_discount': writing off bonuses from the amount of the basket, delivery and discounts (not including promotional dishes)
      3) 'bonus_from_basket_and_delivery': writing off bonuses from the amount of the basket and delivery (not including promotional dishes, discounts)
      4) 'bonus_from_basket': write-off of bonuses from the amount of the basket (not including promotional dishes, discounts and delivery)
  
      Current implement logic for only one strategy
  
     */
    checkBonus(orderId: any, spendBonus: SpendBonus): Promise<void>;
    check(criteria: CriteriaQuery<Order>, customer?: Customer, isSelfService?: boolean, address?: Address, paymentMethodId?: string, spendBonus?: SpendBonus): Promise<void>;
    /** Basket design*/
    order(criteria: CriteriaQuery<Order>): Promise<void>;
>>>>>>> origin/bonuses
    payment(criteria: CriteriaQuery<Order>): Promise<PaymentResponse>;
    paymentMethodId(criteria: CriteriaQuery<Order>): Promise<string>;
    /**  given populated Order instance  by criteria*/
    populate(criteria: CriteriaQuery<Order>): Promise<{
        createdAt?: Date;
        updatedAt?: Date;
        id?: string;
        shortId?: string;
        concept?: string;
        isMixedConcept?: boolean;
        dishes?: number[] | OrderDish[];
        paymentMethod?: any;
        paymentMethodTitle?: string;
        paid?: boolean;
        isPaymentPromise?: boolean;
        dishesCount?: number;
        uniqueDishes?: number;
        modifiers?: any;
        customer?: any;
        address?: any;
        comment?: string;
        personsCount?: string;
        date?: string;
        problem?: boolean;
        rmsDelivered?: boolean;
        rmsId?: string;
        rmsOrderNumber?: string;
        rmsOrderData?: any;
        rmsDeliveryDate?: string;
        rmsErrorMessage?: string;
        rmsErrorCode?: string;
        rmsStatusCode?: string;
        deliveryStatus?: string;
        selfService?: boolean;
        deliveryDescription?: string;
        message?: string;
        deliveryItem?: string | Dish;
        deliveryCost?: number;
        totalWeight?: number;
        trifleFrom?: number;
        bonusesTotal?: number;
        spendBonus?: SpendBonus;
        total?: number;
        basketTotal?: number;
        orderTotal?: number;
        discountTotal?: number;
        orderDate?: string;
        deviceId?: string;
        user?: string | User;
        customData?: any;
        state?: string;
    }>;
    countCart(criteria: CriteriaQuery<Order>): Promise<Order>;
    doPaid(criteria: CriteriaQuery<Order>, paymentDocument: PaymentDocument): Promise<void>;
};
declare global {
    const Order: typeof Model & ORMModel<Order, null> & StateFlowModel;
}
