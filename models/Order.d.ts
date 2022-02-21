import Address from "../interfaces/Address";
import Customer from "../interfaces/Customer";
import OrderDish from "./OrderDish";
import PaymentDocument from "./PaymentDocument";
import ORMModel from "../interfaces/ORMModel";
import ORM from "../interfaces/ORM";
import StateFlowModel from "../interfaces/StateFlowModel";
import Dish from "./Dish";
declare let attributes: {
    /** Id  */
    id: string;
    /** last 8 chars from id */
    shortId: string;
    /** */
    dishes: {};
    /** */
    discount: any;
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
    /** total = orderTotal */
    total: number;
    /**  orderTotal = total + deliveryCost - discountTotal - bonusesTotal */
    orderTotal: number;
    discountTotal: number;
    orderDate: string;
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
    beforeValidate(orderInit: any, next: any): void;
    /** Add dish into order */
    addDish(criteria: any, dish: string | Dish, amount: number, modifiers: {}, comment: string, addedBy: string, replace?: boolean, orderDishId?: number): any;
    removeDish(criteria: any, dish: OrderDish, amount: number, stack?: boolean): any;
    setCount(criteria: any, dish: OrderDish, amount: number): any;
    setComment(criteria: any, dish: OrderDish, comment: string): any;
    /**
     * Set order selfService field. Use this method to change selfService.
     * @param selfService
     */
    setSelfService(criteria: any, selfService?: boolean): any;
    check(criteria: any, customer?: Customer, isSelfService?: boolean, address?: Address, paymentMethodId?: string): any;
    /** Оформление корзины */
    order(criteria: any): any;
    payment(criteria: any): any;
    paymentMethodId(criteria: any): any;
    /**  given populated Order instance  by criteria*/
    populate(criteria: any): unknown;
    /**
     * Считает количество, вес и прочие данные о корзине в зависимости от полоенных блюд
     * Подсчет должен происходить только до перехода на чекаут
     * @param order
     */
    countCart(criteria: any): unknown;
    doPaid(criteria: any, paymentDocument: PaymentDocument): any;
};
declare global {
    const Order: typeof Model & ORMModel<Order> & StateFlowModel;
}
