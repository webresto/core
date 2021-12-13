import Address from "../interfaces/Address";
import Customer from "../interfaces/Customer";
import CartDish from "./CartDish";
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
    /** cart total weight */
    totalWeight: number;
    /** total = cartTotal */
    total: number;
    /**  orderTotal = total + deliveryCost - discountTotal - bonusesTotal */
    orderTotal: number;
    cartTotal: number;
    discountTotal: number;
    orderDate: string;
    customData: any;
};
interface stateFlowInstance {
    state: string;
}
declare type attributes = typeof attributes & stateFlowInstance;
interface Cart extends attributes, ORM {
}
export default Cart;
declare let Model: {
    beforeCreate(cartInit: any, next: any): void;
    /** Add dish into cart */
    addDish(criteria: any, dish: string | Dish, amount: number, modifiers: {}, comment: string, addedBy: string, replace?: boolean, cartDishId?: number): Promise<void>;
    removeDish(criteria: any, dish: CartDish, amount: number, stack?: boolean): Promise<void>;
    setCount(criteria: any, dish: CartDish, amount: number): Promise<void>;
    setComment(criteria: any, dish: CartDish, comment: string): Promise<void>;
    /**
     * Set cart selfService field. Use this method to change selfService.
     * @param selfService
     */
    setSelfService(criteria: any, selfService?: boolean): Promise<Cart>;
    check(criteria: any, customer?: Customer, isSelfService?: boolean, address?: Address, paymentMethodId?: string): Promise<void>;
    /** Оформление корзины */
    order(criteria: any): Promise<number>;
    payment(criteria: any): Promise<PaymentResponse>;
    paymentMethodId(criteria: any): Promise<string>;
    /**  given populated Cart instance  by criteria*/
    populate(criteria: any): unknown;
    /**
     * Считает количество, вес и прочие данные о корзине в зависимости от полоенных блюд
     * Подсчет должен происходить только до перехода на чекаут
     * @param cart
     */
    countCart(criteria: any): unknown;
    doPaid(criteria: any, paymentDocument: PaymentDocument): any;
};
declare global {
    const Cart: typeof Model & ORMModel<Cart> & StateFlowModel;
}
