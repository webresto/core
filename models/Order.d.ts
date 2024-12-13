import { OrderModifier } from "../interfaces/Modifier";
import Address from "../interfaces/Address";
import Customer from "../interfaces/Customer";
import { ORMModel, CriteriaQuery } from "../interfaces/ORMModel";
import ORM from "../interfaces/ORM";
import StateFlowModel from "../interfaces/StateFlowModel";
import { PaymentResponse } from "../interfaces/Payment";
import { OptionalAll } from "../interfaces/toolsTS";
import { SpendBonus } from "../interfaces/SpendBonus";
import { Delivery } from "../adapters/delivery/DeliveryAdapter";
import { PaymentMethodRecord } from "./PaymentMethod";
import { OrderDishRecord } from "./OrderDish";
import { PromotionCodeRecord } from "./PromotionCode";
import { PlaceRecord } from "./Place";
import { DishRecord } from "./Dish";
import { UserRecord } from "./User";
import { PaymentDocumentRecord } from "./PaymentDocument";
export interface PromotionState {
    type: string;
    message: string;
    state: object | object[];
}
export type PaymentBack = {
    backLinkSuccess: string;
    backLinkFail: string;
    comment: string;
};
declare let attributes: {
    /** Id  */
    id: string;
    /** last 8 chars from id */
    shortId: string;
    /** Stateflow field */
    state: string;
    /** Concept string */
    concept: string[];
    /** the basket contains mixed types of concepts */
    isMixedConcept: boolean;
    /**
     * @deprecated will be rename to `Items` in **v2**
     */
    dishes: OrderDishRecord[] | number[];
    paymentMethod: PaymentMethodRecord | string;
    /** */
    paymentMethodTitle: string;
    paid: boolean;
    /** */
    isPaymentPromise: boolean;
    /**
     * The property displays the state of promotion.
     * To understand what was happening with the order in the adapter of promoters.
     *
     * This property can be used to portray the representations of promotions at the front
     */
    promotionState: PromotionState[];
    /**
     * It's worth collecting errors to simplify debugging
     */
    promotionErrors: object | object[];
    /**
     * hidden in api
     */
    promotionCode: PromotionCodeRecord | string;
    promotionCodeDescription: string;
    promotionCodeString: string;
    /**
     * The discount will be applied to basketTotal during countCart
     * This will be cleared before passing promotions count
     */
    promotionFlatDiscount: number;
    /**
     * Promotion may estimate shipping costs, and if this occurs,
     * then the calculation of delivery through the adapter will be ignored.
     */
    promotionDelivery: Delivery;
    /**
    * The user's locale is a priority, the cart locale may not be installed, then the default locale of the site will be selected.
    locale: {
      type: "string",
      // isIn:  todo
      allowNull: true
    } as unknown as string,
    */
    /**
     * Date until promocode is valid
     * This is needed for calculating promotion in realtime without a request in DB
     */
    promotionCodeCheckValidTill: string;
    /**
     * If you set this field through promotion, then the order will not be possible to order
     */
    promotionUnorderable: boolean;
    /**
     ** Means that the basket was modified by the adapter,
     * It also prevents the repeat call of the action of the handler of the handler
     * */
    isPromoting: boolean;
    /** */
    dishesCount: number;
    uniqueDishes: number;
    modifiers: any;
    customer: Customer;
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
    pickupPoint: PlaceRecord | string;
    selfService: boolean;
    delivery: Delivery | null;
    /** Notification about delivery
     * ex: time increased due to traffic jams
     * @deprecated should changed for order.delivery.message
     * */
    deliveryDescription: string;
    message: string;
    /**
     * @deprecated use order.delivery.item
     */
    deliveryItem: DishRecord | string;
    /**
     * @deprecated use order.delivery.cost
     */
    deliveryCost: number;
    /** order total weight */
    totalWeight: number;
    /** Сдача */
    trifleFrom: number;
    /** Sum of all bonuses */
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
     * Calculated discount, not recommend for changing
     *
     * !!! This field is for visual display, do not use it for transmission to the payment gateway
     */
    discountTotal: number;
    orderDate: string;
    /**
     * @experimental
     * This field allows you to somehow mark the recycle bin, although this is not used in current versions of the kernel.
     * Designed for creating some custom logic, through visual programming or through modules.
     */
    tag: string;
    deviceId: string;
    /**
     * A number that will change every time the order is changed
     */
    nonce: number;
    /**
     * Populated order stringify hash
     */
    hash: string;
    /**
     * Add IP, UserAgent for anonymous cart
     */
    user: UserRecord | string;
    customData: any;
};
interface stateFlowInstance {
    state: string;
}
type attributes = typeof attributes & stateFlowInstance;
export interface OrderRecord extends ORM, OptionalAll<attributes> {
}
declare let Model: {
    beforeCreate(orderInit: OrderRecord, cb: (err?: string) => void): void;
    afterCreate(order: OrderRecordRecord, cb: (err?: string) => void): Promise<void>;
    /** Add a dish into order */
    addDish(criteria: CriteriaQuery<OrderRecord>, dish: DishRecord | string, amount: number, modifiers: OrderModifier[], comment: string, addedBy: "user" | "promotion" | "core" | "custom", replace?: boolean, orderDishId?: number): Promise<void>;
    removeDish(criteria: CriteriaQuery<OrderRecord>, dish: OrderDishRecord, amount: number, stack?: boolean): Promise<void>;
    setCount(criteria: CriteriaQuery<OrderRecord>, dish: OrderDishRecord, amount: number): Promise<void>;
    setComment(criteria: CriteriaQuery<OrderRecord>, dish: OrderDishRecord, comment: string): Promise<void>;
    /**
     * Clone dishes in new order
     * @param source Order findOne criteria
     * @returns new order
     */
    clone(source: CriteriaQuery<OrderRecord>): Promise<OrderRecord>;
    /**
     * Set order selfService field. Use this method to change selfService.
     * @param criteria
     * @param selfService
     */
    setSelfService(criteria: CriteriaQuery<OrderRecord>, selfService?: boolean): Promise<OrderRecord>;
    /**
     * !! Not for external use, only in Order.check
     * The use of bonuses in the cart implies that this order has a user.
     * Then all checks will be made, and a record will be written in the transaction of user bonuses
     *
     Bonus spending strategies :
      1) 'bonus_from_order_total': (default) deduction from the final amount of the order including promotional dishes, discounts and delivery
      2) 'bonus_from_basket_delivery_discount': writing off bonuses from the amount of the basket, delivery and discounts (not including promotional dishes)
      3) 'bonus_from_basket_and_delivery': writing off bonuses from the amount of the basket and delivery (not including promotional dishes, discounts)
      4) 'bonus_from_basket': write-off of bonuses from the amount of the basket (not including promotional dishes, discounts and delivery)
  
      Current implement logic for only one strategy
  
     */
    checkBonus(orderId: string, spendBonus: SpendBonus): Promise<void>;
    clearOfPromotion(): Promise<void>;
    check(criteria: CriteriaQuery<OrderRecord>, customer?: Customer, isSelfService?: boolean, address?: Address, paymentMethodId?: string, userId?: string, spendBonus?: SpendBonus): Promise<void>;
    /** Basket design*/
    order(criteria: CriteriaQuery<OrderRecord>): Promise<void>;
    payment(criteria: CriteriaQuery<OrderRecord>): Promise<PaymentResponse>;
    clear(criteria: CriteriaQuery<OrderRecord>): Promise<void>;
    /**
     * Method for quickly setting a Order tag
     * @experimental
     * @param criteria
     * @param tag
     * @returns
     */
    tag(criteria: CriteriaQuery<OrderRecord>, tag: string): Promise<OrderRecord>;
    setCustomData(criteria: CriteriaQuery<OrderRecord>, customData: object): Promise<void>;
    paymentMethodId(criteria: CriteriaQuery<OrderRecord>): Promise<string>;
    /**  given populated Order instance by criteria*/
    populate(criteria: CriteriaQuery<OrderRecord>): Promise<{
        createdAt?: Date | undefined;
        updatedAt?: Date | undefined;
        id?: string;
        shortId?: string;
        state?: string;
        concept?: string[];
        isMixedConcept?: boolean;
        dishes?: OrderDishRecord[] | number[];
        paymentMethod?: PaymentMethodRecord | string;
        paymentMethodTitle?: string;
        paid?: boolean;
        isPaymentPromise?: boolean;
        promotionState?: PromotionState[];
        promotionErrors?: object | object[];
        promotionCode?: PromotionCodeRecord | string;
        promotionCodeDescription?: string;
        promotionCodeString?: string;
        promotionFlatDiscount?: number;
        promotionDelivery?: Delivery;
        promotionCodeCheckValidTill?: string;
        promotionUnorderable?: boolean;
        isPromoting?: boolean;
        dishesCount?: number;
        uniqueDishes?: number;
        modifiers?: any;
        customer?: Customer;
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
        pickupPoint?: PlaceRecord | string;
        selfService?: boolean;
        delivery?: Delivery | null;
        deliveryDescription?: string;
        message?: string;
        deliveryItem?: DishRecord | string;
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
        tag?: string;
        deviceId?: string;
        nonce?: number;
        hash?: string;
        user?: UserRecord | string;
        customData?: any;
    }>;
    /**
     * Method for calculating the basket. This is called every time the cart changes.
     * @param criteria OrderId
     * @param isPromoting If you use countCart inside a promo, then you should indicate this is `true`. Also, you should set the isPromoting state in the model
     * @returns Order
     */
    countCart(criteria: CriteriaQuery<OrderRecord>, isPromoting?: boolean): Promise<OrderRecord>;
    doPaid(criteria: CriteriaQuery<OrderRecord>, paymentDocument: PaymentDocumentRecord): Promise<void>;
    applyPromotionCode(criteria: CriteriaQuery<OrderRecord>, promotionCodeString: string | null): Promise<OrderRecord>;
};
declare global {
    const Order: typeof Model & ORMModel<OrderRecord, null> & StateFlowModel;
}
export {};
