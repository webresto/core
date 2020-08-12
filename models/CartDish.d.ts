import ORM from "../modelsHelp/ORM";
import Dish from "../models/Dish";
import Modifier from "../modelsHelp/Modifier";
import ORMModel from "../modelsHelp/ORMModel";
export default interface CartDish extends ORM {
    id: string;
    amount: number;
    dish: Dish;
    modifiers: Modifier[];
    uniqueItems: number;
    itemTotal: number;
    weight: number;
    totalWeight: number;
    comment: string;
}
export interface CartDishModel extends ORMModel<CartDish> {
}
declare global {
    const CartDish: CartDishModel;
}
