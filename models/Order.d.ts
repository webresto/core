import { OrderModifier } from "../interfaces/Modifier";
import Address from "../interfaces/Address";
import Customer from "../interfaces/Customer";
import OrderDish from "./OrderDish";
import PaymentDocument from "./PaymentDocument";
import { ORMModel, CriteriaQuery } from "../interfaces/ORMModel";
import ORM from "../interfaces/ORM";
import StateFlowModel from "../interfaces/StateFlowModel";
import Dish from "./Dish";
import Place from "./Place";
import User from "./User";
import { PaymentResponse } from "../interfaces/Payment";
import { OptionalAll } from "../interfaces/toolsTS";
import { SpendBonus } from "../interfaces/SpendBonus";
import { Delivery } from "../adapters/delivery/DeliveryAdapter";
import PromotionCode from "./PromotionCode";
export interface PromotionState {
    type: string;
    message: string;
    state: any;
}
declare let attributes: {
    /** Id  */
    id: string;
    /** last 8 chars from id */
    shortId: string;
    /** Stateflow field */
    state: string;
    /** Concept string */
    concept: string;
    /** the basket contains mixed types of concepts */
    isMixedConcept: boolean;
    /**
     * @deprecated will be rename to `Items` in **v2**
     */
    dishes: number[] | OrderDish[];
    paymentMethod: any;
    /** */
    paymentMethodTitle: string;
    paid: boolean;
    /** */
    isPaymentPromise: boolean;
    /**
     * The property displays the state of promotion.
     * In order to understand what was happening with the order in the adapter of promoters.
     *
     * This property can be used to portray the representations of promotions at the front
     */
    promotionState: PromotionState[];
    promotionCode: string | PromotionCode;
    promotionCodeString: string;
    /**
     * The discount will be applied to basketTotal during countCart
     * This will be cleared before passing promotions count
     */
    promotionFlatDiscount: number;
    /**
    * The user's locale is a priority, the cart locale may not be installed, then the default locale of the site will be selected.
    locale: {
      type: "string",
      // isIn:  todo
      allowNull: true
    } as unknown as string,
    */
    /**
     * Date untill promocode is valid
     * This need for calculate promotion in realtime without request in DB
     */
    promotionCodeCheckValidTill: string;
    /**
     ** Means that the basket was modified by the adapter,
     * It also prevents the repeat call of the action of the handler of the handler
     * */
    isPromoting: boolean;
    /** */
    dishesCount: number;
    uniqueDishes: number;
    modifiers: any;
    customer: any;
    address: Address;
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
    pickupPoint: string | Place;
    selfService: boolean;
    delivery: Delivery;
    /** Notification about delivery
     * ex: time increased due to traffic jams
     * @deprecated should changed for order.delivery.message
     * */
    deliveryDescription: string;
    message: string;
    /**
     * @deprecated use order.delivery.item
     */
    deliveryItem: string | Dish;
    /**
     * @deprecated use order.delivery.cost
     */
    deliveryCost: number;
    /** order total weight */
    totalWeight: number;
    /** Сдача */
    trifleFrom: number;
    /** Summ of all bobnuses */
    bonusesTotal: number;
    spendBonus: SpendBonus;
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
    /**
     * Calculated discount, not recomend for changing
     */
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
    beforeCreate(orderInit: Order, cb: (err?: string) => void): void;
    /** Add dish into order */
    addDish(criteria: CriteriaQuery<Order>, dish: string | Dish, amount: number, modifiers: OrderModifier[], comment: string, addedBy: string, replace?: boolean, orderDishId?: number): Promise<void>;
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
     * !! Not for external use, only in Order.check
     * The use of bonuses in the cart implies that this order has a user.
     * Then all checks will be made and a record will be written in the transaction of user bonuses
     *
     Bonus spending strategies :
      1) 'bonus_from_order_total': (default) deduction from the final amount of the order including promotional dishes, discounts and delivery
      2) 'bonus_from_basket_delivery_discount': writing off bonuses from the amount of the basket, delivery and discounts (not including promotional dishes)
      3) 'bonus_from_basket_and_delivery': writing off bonuses from the amount of the basket and delivery (not including promotional dishes, discounts)
      4) 'bonus_from_basket': write-off of bonuses from the amount of the basket (not including promotional dishes, discounts and delivery)
  
      Current implement logic for only one strategy
  
     */
    checkBonus(orderId: any, spendBonus: SpendBonus): Promise<void>;
    clearOfPromotion(): Promise<void>;
    check(criteria: CriteriaQuery<Order>, customer?: Customer, isSelfService?: boolean, address?: Address, paymentMethodId?: string, spendBonus?: SpendBonus): Promise<void>;
    /** Basket design*/
    order(criteria: CriteriaQuery<Order>): Promise<void>;
    payment(criteria: CriteriaQuery<Order>): Promise<PaymentResponse>;
    paymentMethodId(criteria: CriteriaQuery<Order>): Promise<string>;
    /**  given populated Order instance  by criteria*/
    populate(criteria: CriteriaQuery<Order>): Promise<{
        createdAt?: Date;
        updatedAt?: Date;
        id?: string;
        shortId?: string;
        state?: string;
        concept?: string;
        isMixedConcept?: boolean;
        dishes?: number[] | OrderDish[];
        paymentMethod?: any;
        paymentMethodTitle?: string;
        paid?: boolean;
        isPaymentPromise?: boolean;
        promotionState?: PromotionState[];
        promotionCode?: string | PromotionCode;
        promotionCodeString?: string;
        promotionFlatDiscount?: number;
        promotionCodeCheckValidTill?: string;
        isPromoting?: boolean;
        dishesCount?: number;
        uniqueDishes?: number;
        modifiers?: any;
        customer?: any;
        address?: Address;
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
        pickupPoint?: string | Place;
        selfService?: boolean;
        delivery?: Delivery;
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
    }>;
    countCart(criteria: CriteriaQuery<Order>): Promise<Order>;
    doPaid(criteria: CriteriaQuery<Order>, paymentDocument: PaymentDocument): Promise<void>;
    applyPromotionCode(criteria: CriteriaQuery<Order>, promotionCodeString: string): Promise<Order>;
};
declare global {
    const Order: typeof Model & ORMModel<Order, null> & StateFlowModel;
}
