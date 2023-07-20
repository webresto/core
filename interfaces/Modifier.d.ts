import Group from "../models/Group";
import Dish from "../models/Dish";
interface BaseModifier {
    modifierId: string;
    amount?: number;
    dish?: Dish | string;
    maxAmount?: number;
    minAmount?: number;
    defaultAmount?: number;
    freeAmount?: number;
    required: boolean | null;
    freeOfChargeAmount?: number | null;
}
export interface OrderModifier {
    id: string;
    amount?: number;
    dish?: Dish;
    modifierId?: string;
}
export interface Modifier extends BaseModifier {
    id: string;
}
export interface GroupModifier extends BaseModifier {
    id?: string;
    childModifiers: Modifier[];
    group?: Group | string;
    groupId?: string;
    isSingleModifierGroupWrapper?: boolean;
}
export {};
