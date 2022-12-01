import { Modifier } from "../interfaces/Modifier";
import Address from "../interfaces/Address";
import Customer from "../interfaces/Customer";
import OrderDish from "./OrderDish";
import PaymentDocument from "./PaymentDocument";
import ORMModel from "../interfaces/ORMModel";
import ORM from "../interfaces/ORM";
import StateFlowModel from "../interfaces/StateFlowModel";
import Dish from "./Dish";
import { PaymentResponse } from "../interfaces/Payment";
declare let attributes: {
    /** Id  */
    id: string;
    /** last 8 chars from id */
    shortId: string;
    /** Концепт к которому относится группа */
    concept: string;
    /** */
    dishes: number[] | OrderDish[];
    paymentMethod: any;
    /** */
    paymentMethodTitle: string;
    paid: {
        type: string;
        defaultsTo: boolean;
    };
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
    deliveryItem: any;
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
    user: any;
    customData: any;
};
interface stateFlowInstance {
    state: string;
}
declare type attributes = typeof attributes & stateFlowInstance;
interface Order extends attributes, ORM {
}
export default Order;
declare let Model: {
    beforeCreate(orderInit: any, next: any): void;
    /** Add dish into order */
    addDish(criteria: any, dish: Dish | string, amount: number, modifiers: Modifier[], comment: string, addedBy: string, replace?: boolean, orderDishId?: number): Promise<void>;
    removeDish(criteria: any, dish: OrderDish, amount: number, stack?: boolean): Promise<void>;
    setCount(criteria: any, dish: OrderDish, amount: number): Promise<void>;
    setComment(criteria: any, dish: OrderDish, comment: string): Promise<void>;
    /**
     * Set order selfService field. Use this method to change selfService.
     * @param selfService
     */
    setSelfService(criteria: any, selfService?: boolean): Promise<Order>;
    check(criteria: any, customer?: Customer, isSelfService?: boolean, address?: Address, paymentMethodId?: string): Promise<void>;
    /** Оформление корзины */
    order(criteria: any): Promise<number>;
    payment(criteria: any): Promise<PaymentResponse>;
    paymentMethodId(criteria: any): Promise<string>;
    /**  given populated Order instance  by criteria*/
    populate(criteria: any): Promise<{
        /** Id  */
        id: string;
        /** last 8 chars from id */
        shortId: string;
        /** Концепт к которому относится группа */
        concept: string;
        /** */
        dishes: number[] | OrderDish[];
        paymentMethod: any;
        /** */
        paymentMethodTitle: string;
        paid: {
            type: string;
            defaultsTo: boolean;
        };
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
        deliveryItem: any;
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
        user: any;
        customData: any;
        state: string;
        toJSON(): any;
    }>;
    /**
     * Считает количество, вес и прочие данные о корзине в зависимости от полоенных блюд
     * Подсчет должен происходить только до перехода на чекаут
     * @param order
     */
    countCart(criteria: any): Promise<Order>;
    doPaid(criteria: any, paymentDocument: PaymentDocument): Promise<void>;
};
declare global {
    const Order: typeof Model & ORMModel<Order> & StateFlowModel;
}
