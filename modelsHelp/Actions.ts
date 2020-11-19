import Modifier from "../modelsHelp/Modifier";
import Cart from "../models/Cart";

/**
 * Описывает возможные дейтсвия с корзиной
 */
export default interface Actions {
  addDish(cart:Cart, params: AddDishParams): Promise<Cart>;

  delivery(cart:Cart, params: DeliveryParams): Promise<Cart>;

  /** Reset all cart action  */
  reset(cart:Cart, cartId: string): Promise<Cart>;

  setDeliveryDescription(cart:Cart, params: DeliveryDescriptionParams): Promise<Cart>;

  reject(cart:Cart, params: ActionParams): Promise<Cart>;

  setMessage(cart:Cart, params: MessageParams): Promise<Cart>;

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
