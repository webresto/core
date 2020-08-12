import Group from "../models/Group";
import Dish from "../models/Dish";
export default interface Modifier {
    id: string;
    modifierId: string;
    amount: number;
    childModifiers: Modifier[];
    group: Group;
    dish: Dish;
    groupId?: string;
}
