import Group from "../models/Group";
import Dish from "../models/Dish";
/**
 * Описывает модификаторы внутри групповых модификаторов, также применяется в cartDish
 */
export interface Modifier {
    id: string;
    modifierId: string;
    amount?: number;
    childModifiers: Modifier[];
    dish?: Dish;
    group?: Group;
    groupId?: string;
}
export interface GroupModifier {
    id?: string;
    modifierId: string;
    childModifiers: Modifier[];
    group?: Group | any;
    groupId?: string;
    isSingleModifierGroupWrapper?: boolean;
}
