import Modifier from "@webresto/core/modelsHelp/Modifier";
import Cart from "../../../@webresto/core/models/Cart";
/**
 * Описывает возможные дейтсвия с корзиной
 */
export default interface Actions {
    addDish(params: AddDishParams): Promise<Cart>;
    delivery(params: DeliveryParams): Promise<Cart>;
    reset(cartId: string): Promise<Cart>;
    setDeliveryDescription(params: DeliveryDescriptionParams): Promise<Cart>;
    reject(params: ActionParams): Promise<Cart>;
    setMessage(params: MessageParams): Promise<Cart>;
    return(): number;
}
/**
 * Базовый параметр для действий Condition
 */
export interface ActionParams {
    cartId: string;
}
export interface AddDishParams extends ActionParams {
    dishesId: string[];
    amount?: number;
    modifiers?: Modifier[];
    comment?: string;
}
export interface DeliveryParams extends ActionParams {
    deliveryCost?: number;
    deliveryItem?: string;
}
export interface DeliveryDescriptionParams extends ActionParams {
    description: string;
}
export interface MessageParams extends ActionParams {
    message: string;
}
