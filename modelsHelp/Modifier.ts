import Group from "../models/Group";
import Dish from "../models/Dish";

/**
 * Описывает модификатор внутри CartDish
 */
export default interface Modifier {
  id: string;
  modifierId: string;
  amount: number;
  childModifiers: Modifier[];
  group: Group;
  dish: Dish;
  groupId?: string;
}
