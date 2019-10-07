import Group from "@webresto/core/models/Group";
import Dish from "@webresto/core/models/Dish";

export default interface Modifier {
  id: string;
  modifierId: string;
  amount: number;
  childModifiers: Modifier[];
  group: Group;
  dish: Dish;
}
