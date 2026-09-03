import { OrderModifier } from "../interfaces/Modifier";
import Address from "../interfaces/Address";
import Customer from "../interfaces/Customer";
import { ORMModel, CriteriaQuery } from "../interfaces/ORMModel";
import ORM from "../interfaces/ORM";
import { PaymentResponse } from "../interfaces/Payment";
import { OptionalAll } from "../interfaces/toolsTS";
import { SpendBonus } from "../interfaces/SpendBonus";
import { Delivery } from "../adapters/delivery/contracts";
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
import { OrderLogLevel, OrderLogEntry } from "../libs/OrderLogHelper";
export type { OrderLogLevel, OrderLogEntry };
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
    /** Business order timestamp in seconds since 1970 */
    orderedAt: number;
    /** Business completion timestamp in seconds since 1970 */
    completedAt: number;
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
    rmsOrderStatus: string;
    pickupPoint: PlaceRecord | string;
    /**
     * The kitchen this order is cooked at.
     *
     * `null` until a resolver chain is configured: an installation that never sets
     * `KITCHEN_RESOLVE_CHAIN` keeps working off the single default cooking point,
     * exactly as it did before an order could carry one of its own.
     */
    cookingPoint: PlaceRecord | string | null;
    /**
     * Every kitchen this order is cooked at, in route order.
     *
     * Derived from the lines and stored, not computed on read. A route is decided
     * once and then acted on: couriers are told, kitchens are told, and a list
     * that recomputed itself from current stock would answer differently tomorrow
     * than it did when the order was placed.
     *
     * Empty on every single-kitchen order, which is every order until a router
     * module is installed. `cookingPoint` remains the order's primary kitchen and
     * the first stop of the route — nothing reads `cookingPoints` to find it.
     */
    cookingPoints: string[];
    /**
     * How long the customer is willing to wait, in minutes, for an ASAP order.
     *
     * Mutually exclusive with `date`: an order is either "as soon as you can, but
     * no later than this" or "at this time". Both filled in is not a stricter
     * order, it is two different orders, so it is refused rather than reconciled.
     */
    maxWaitMinutes: number;
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
    /** Change */
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
    orderedOnPlatform: string;
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
    /** Order logs */
    logs: OrderLogEntry[];
};
interface stateFlowInstance {
    state: string;
}
type attributes = typeof attributes & stateFlowInstance;
export interface OrderRecord extends ORM, OptionalAll<attributes> {
}
declare let Model: {
    readonly ORDERED_STATES: ReadonlyArray<string>;
    isOrderedState(state: string): boolean;
    beforeCreate(orderInit: OrderRecord, cb: (err?: string) => void): void;
    afterCreate(order: OrderRecord, cb: (err?: string) => void): Promise<void>;
    beforeUpdate(values: Partial<OrderRecord>, cb: (err?: string) => void): void;
    afterUpdate(order: OrderRecord, cb: (err?: string) => void): Promise<void>;
    /** Add a dish into order */
    addDish(criteria: CriteriaQuery<OrderRecord>, dish: DishRecord | string, amount: number, modifiers: OrderModifier[], comment: string, 
    /**
     * user - added manually by human
     * promotion - cleaned in each calculated promotion
     * core - is reserved for
     * custom - custom integration can process it
     */
    addedBy: "user" | "promotion" | "core" | "custom", replace?: boolean, orderDishId?: number): Promise<void>;
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
    check(criteria: CriteriaQuery<OrderRecord>, customer?: Customer, isSelfService?: boolean, address?: Address, paymentMethodId?: string, userId?: string, spendBonus?: SpendBonus, orderedOnPlatform?: string): Promise<void>;
    /** Basket design*/
    order(criteria: CriteriaQuery<OrderRecord>): Promise<void>;
    /**
     * Cancel any pending PaymentDocument attached to this order.
     *
     * Race scenario this protects against:
     *   1. user clicks "pay" → order goes CHECKOUT, PaymentDocument is created,
     *      user is redirected to the external payment gateway (e.g. YooKassa).
     *   2. user comes back (other tab / browser back) and edits the basket.
     *   3. gateway callback arrives later for an order whose total/contents have changed,
     *      which is unsafe — the user paid for one basket, we'd ship another.
     *
     * Calling this before any basket-mutating operation invalidates the outstanding
     * payment link so the only way forward is to register a new payment matching
     * the new basket. If there is no pending PaymentDocument, this is a no-op.
     *
     * Errors from the underlying adapter cancel are propagated — callers MUST
     * abort the basket mutation in that case (see addDish/removeDish/etc.).
     */
    cancelOrderPayment(criteria: CriteriaQuery<OrderRecord>): Promise<void>;
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
        orderedAt?: number;
        completedAt?: number;
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
        rmsOrderStatus?: string;
        pickupPoint?: PlaceRecord | string;
        cookingPoint?: PlaceRecord | string | null;
        cookingPoints?: string[];
        maxWaitMinutes?: number;
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
        orderedOnPlatform?: string;
        nonce?: number;
        hash?: string;
        user?: UserRecord | string;
        customData?: any;
        logs?: OrderLogEntry[];
    }>;
    /**
     * Method for calculating the basket. This is called every time the cart changes.
     * @param criteria OrderId
     * @param isPromoting If you use countCart inside a promo, then you should indicate this is `true`. Also, you should set the isPromoting state in the model
     * @returns Order
     */
    countCart(criteria: CriteriaQuery<OrderRecord>, isPromoting?: boolean): Promise<OrderRecord>;
    doPaid(criteria: CriteriaQuery<OrderRecord>, paymentDocument: PaymentDocumentRecord): Promise<void>;
    doFinalize(criteriaOne: CriteriaQuery<OrderRecord>, state: "DONE" | "REJECT"): Promise<void>;
    doCart(criteriaOne: CriteriaQuery<OrderRecord>): Promise<OrderRecord>;
    applyPromotionCode(criteria: CriteriaQuery<OrderRecord>, promotionCodeString: string | null): Promise<OrderRecord>;
    /**
     * Write a log entry for an order.
     * Always emits "core:order-log" regardless of settings.
     * Controlled by ORDER_LOG_DISABLE (skip write) and ORDER_LOG_USE_MAP (store in memory).
     * DB writes are debounced (5s) to batch multiple entries.
     */
    log(criteria: CriteriaQuery<OrderRecord>, level: OrderLogLevel, module: string, message: string, ...data: any[]): Promise<void>;
    /**
     * Get logs for an order. Reads from Map or DB depending on ORDER_LOG_USE_MAP setting.
     * Flushes pending debounce buffer before reading from DB.
     */
    getLogs(criteria: CriteriaQuery<OrderRecord>): Promise<OrderLogEntry[]>;
    /**
     * Await emitter.emit and log any handler errors/timeouts into order log.
     */
    emitAndLog(criteria: CriteriaQuery<OrderRecord>, eventName: string, ...args: any[]): Promise<any[]>;
    /**
     * Fire emitter.emit without awaiting it and log handler errors/timeouts into order log.
     */
    emitAndLogDetached(criteria: CriteriaQuery<OrderRecord>, eventName: string, ...args: any[]): void;
    /**
     * State transition method with validation
     * @param criteria - Order criteria (id string or query object)
     * @param nextState - Target state to transition to
     */
    next(criteria: CriteriaQuery<OrderRecord> | string, nextState: string): Promise<void>;
};
declare global {
    const Order: typeof Model & ORMModel<OrderRecord, null>;
}
