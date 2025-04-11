import { DishRecord } from "../models/Dish";
import { GroupRecord } from "../models/Group";
export interface OrderModifier {
    id: string;
    /**
     * Default for amount is 1
     * This will be changed in a future version to have stricter rules
     */
    amount?: number;
    dish?: DishRecord;
    modifierId?: string;
}
interface BaseModifier {
    /**
     * restocore dishId
    */
    modifierId: string;
    amount?: number;
    dish?: DishRecord | string;
    maxAmount?: number | null;
    minAmount?: number | null;
    defaultAmount?: number | null;
    /**
     * @deprecated use freeOfChargeAmount
     */
    freeAmount?: number | null;
    required?: boolean | null;
    /**
     * How many free modifiers can you add?
     */
    freeOfChargeAmount?: number | null;
}
export interface Modifier extends BaseModifier {
    /**
    * rmsId
    */
    id: string;
}
export interface GroupModifier extends BaseModifier {
    id?: string;
    childModifiers: Modifier[];
    group?: GroupRecord | string;
    groupId?: string;
    isSingleModifierGroupWrapper?: boolean;
}
export {};
