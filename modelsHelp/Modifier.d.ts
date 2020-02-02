import Group from "../../../@webresto/core/models/Group";
import Dish from "../../../@webresto/core/models/Dish";
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
