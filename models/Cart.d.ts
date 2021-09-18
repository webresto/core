import { Modifier } from "../interfaces/Modifier";
import Address from "../interfaces/Address";
import Customer from "../interfaces/Customer";
import CartDish from "./CartDish";
import PaymentDocument from "./PaymentDocument";
import ORMModel from "../interfaces/ORMModel";
import ORM from "../interfaces/ORM";
import StateFlowModel from "../interfaces/StateFlowModel";
import Dish from "./Dish";
import { PaymentResponse } from "../interfaces/Payment";
import PaymentMethod from "./PaymentMethod";
declare let attributes: {
    /** Id  */
    id: string;
    /** last 8 chars from id */
    shortId: string;
    /** */
    dishes: CartDish[];
    /** */
    discount: any;
    paymentMethod: string | PaymentMethod;
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
    deliveryItem: string | Dish;
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
    addDish(criteria: any, dish: string | Dish, amount: number, modifiers: Modifier[], comment: string, from: string, replace?: boolean, cartDishId?: number): Promise<void>;
    removeDish(criteria: any, dish: CartDish, amount: number, stack?: boolean): Promise<void>;
    setCount(criteria: any, dish: CartDish, amount: number): Promise<void>;
    setComment(criteria: any, dish: CartDish, comment: string): Promise<void>;
    /**
     * Set cart selfService field. Use this method to change selfService.
     * @param selfService
     */
    setSelfService(criteria: any, selfService: boolean): Promise<void>;
    check(criteria: any, customer?: Customer, isSelfService?: boolean, address?: Address, paymentMethodId?: string): Promise<void>;
    /** Оформление корзины */
    order(criteria: any): Promise<number>;
    payment(criteria: any): Promise<PaymentResponse>;
    paymentMethodId(criteria: any, cart?: Cart): Promise<string>;
    /**  given populated Cart instance  by criteria*/
    populate(criteria: any): Promise<Cart>;
    /**
     * Считает количество, вес и прочие данные о корзине в зависимости от полоенных блюд
     * @param cart
     */
    countCart(criteria: any): Promise<Cart>;
    doPaid(criteria: any, paymentDocument: PaymentDocument): Promise<void>;
};
declare global {
    const Cart: typeof Model & ORMModel<Cart> & StateFlowModel;
}
