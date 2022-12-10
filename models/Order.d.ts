import { Modifier } from "../interfaces/Modifier";
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
import { OptionalAll, RequiredField } from "../interfaces/toolsTS";
declare let attributes: {
    /** Id  */
    id: string;
    /** last 8 chars from id */
    shortId: string;
    /** Концепт к которому относится группа */
    concept: string;
    /** */
    dishes: OrderDish[] | number[];
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
    /** Желаемая дата и время доставки */
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
    /** total = orderTotal + deliveryCost - discountTotal - bonusesTotal */
    total: number;
    /**
    *   @deprecated orderTotal use orderCost
    */
    orderTotal: number;
    discountTotal: number;
    orderDate: string;
    /** Родительская группа */
    user: string | User;
    customData: any;
};
interface stateFlowInstance {
    state: string;
}
declare type attributes = typeof attributes & stateFlowInstance;
interface Order extends ORM, RequiredField<OptionalAll<attributes>, "id"> {
}
export default Order;
declare let Model: {
    beforeCreate(orderInit: any, next: any): void;
    /** Add dish into order */
    addDish(criteria: CriteriaQuery<Order>, dish: Dish | string, amount: number, modifiers: Modifier[], comment: string, addedBy: string, replace?: boolean, orderDishId?: number): Promise<void>;
    removeDish(criteria: CriteriaQuery<Order>, dish: OrderDish, amount: number, stack?: boolean): Promise<void>;
    setCount(criteria: CriteriaQuery<Order>, dish: OrderDish, amount: number): Promise<void>;
    setComment(criteria: CriteriaQuery<Order>, dish: OrderDish, comment: string): Promise<void>;
    /**
     * Set order selfService field. Use this method to change selfService.
     * @param selfService
     */
    setSelfService(criteria: CriteriaQuery<Order>, selfService?: boolean): Promise<Order>;
    check(criteria: CriteriaQuery<Order>, customer?: Customer, isSelfService?: boolean, address?: Address, paymentMethodId?: string): Promise<void>;
    /** Оформление корзины */
    order(criteria: CriteriaQuery<Order>): Promise<number>;
    payment(criteria: CriteriaQuery<Order>): Promise<PaymentResponse>;
    paymentMethodId(criteria: CriteriaQuery<Order>): Promise<string>;
    /**  given populated Order instance  by criteria*/
    populate(criteria: CriteriaQuery<Order>): Promise<{
        createdAt?: Date;
        updatedAt?: Date;
        id: string;
        shortId?: string;
        concept?: string;
        dishes?: OrderDish[] | number[];
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
        total?: number;
        orderTotal?: number;
        discountTotal?: number;
        orderDate?: string;
        user?: string | User;
        customData?: any;
        state?: string;
    }>;
    /**
     * Считает количество, вес и прочие данные о корзине в зависимости от полоенных блюд
     * Подсчет должен происходить только до перехода на чекаут
     * @param order
     */
    countCart(criteria: CriteriaQuery<Order>): Promise<Order>;
    doPaid(criteria: CriteriaQuery<Order>, paymentDocument: PaymentDocument): Promise<void>;
};
declare global {
    const Order: typeof Model & ORMModel<Order> & StateFlowModel;
}
