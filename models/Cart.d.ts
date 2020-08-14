import Modifier from "../modelsHelp/Modifier";
import Address from "../modelsHelp/Address";
import Customer from "../modelsHelp/Customer";
import CartDish from "../models/CartDish";
import PaymentMethod from "../models/PaymentMethod";
import StateFlow from "../modelsHelp/StateFlow";
import ORMModel from "../modelsHelp/ORMModel";
import ORM from "../modelsHelp/ORM";
import Dish from "./Dish";
export default interface Cart extends ORM, StateFlow {
    id: string;
    cartId: string;
    dishes: Association<CartDish>;
    paymentMethod: Association<PaymentMethod>;
    paid: "boolean";
    dishesCount: number;
    uniqueDishes: number;
    cartTotal: number;
    modifiers: Modifier[];
    delivery: number;
    customer: Customer;
    address: Address;
    comment: string;
    personsCount: number;
    problem: boolean;
    sendToIiko: boolean;
    rmsId: string;
    deliveryStatus: number;
    selfDelivery: boolean;
    deliveryDescription: string;
    message: string;
    deliveryItem: string;
    totalWeight: number;
    total: number;
    addDish(dish: Dish | string, amount: number, modifiers: Modifier[], comment: string, from: string): Promise<void>;
    removeDish(dish: CartDish, amount: number, stack?: boolean): Promise<void>;
    setCount(dish: CartDish, amount: number): Promise<void>;
    setModifierCount(dish: CartDish, modifier: Dish, amount: number): Promise<void>;
    setComment(dish: CartDish, comment: string): Promise<void>;
    setSelfDelivery(selfService: boolean): Promise<void>;
    check(customer: Customer, isSelfService: boolean, address?: Address, paymentMethod?: string): Promise<boolean>;
    order(): Promise<number>;
}
export interface CartModel extends ORMModel<Cart> {
    returnFullCart(cart: Cart): Promise<Cart>;
    countCart(cart: Cart): any;
}
declare global {
    const Cart: CartModel;
}
