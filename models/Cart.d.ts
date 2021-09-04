import { Modifier } from "../interfaces/Modifier";
import Address from "../interfaces/Address";
import Customer from "../interfaces/Customer";
import PaymentDocument from "./PaymentDocument";
import ORMModel from "../interfaces/ORMModel";
import ORM from "../interfaces/ORM";
import { PaymentResponse } from "../interfaces/Payment";
declare let attributes: any;
declare type Cart = typeof attributes & ORM;
export default Cart;
declare let Model: {
    addDish(criteria: any, dish: any, amount: number, modifiers: Modifier[], comment: string, from: string, replace: boolean, cartDishId: number): Promise<void>;
    removeDish(criteria: any, dish: any, amount: number, stack?: boolean): Promise<void>;
    setCount(criteria: any, dish: any, amount: number): Promise<void>;
    setComment(criteria: any, dish: any, comment: string): Promise<void>;
    /**
     * Set cart selfService field. Use this method to change selfService.
     * @param selfService
     */
    setSelfService(criteria: any, selfService: boolean): Promise<void>;
    check(criteria: any, customer?: Customer, isSelfService?: boolean, address?: Address, paymentMethodId?: string): Promise<any>;
    order(criteria: any): Promise<number>;
    payment(criteria: any): Promise<PaymentResponse>;
    paymentMethodId(criteria: any, cart?: any): Promise<string>;
    /**
     * Считает количество, вес и прочие данные о корзине в зависимости от полоенных блюд
     * @param cart
     */
    countCart(criteria: any, cart: any): Promise<any>;
    doPaid(criteria: any, paymentDocument: PaymentDocument): Promise<void>;
};
declare global {
    const Cart: typeof Model & ORMModel<Cart>;
}
