import { DishRecord } from "../models/Dish";
import { GroupRecord } from "../models/Group";
export interface OrderModifier {
    /**
     * restocore dishId
    */
    id: string;
    rmsId: string;
    /**
     * Default for amount is 1
     * This will be changed in a future version to have stricter rules
     */
    amount?: number;
    dish?: DishRecord;
    /**
   * meaning is rmsId
   * @deprecated use id
   */
    modifierId?: string;
    /**
     * restocore group.id
     */
    groupId?: string;
}
interface BaseModifier {
    /**
     * restocore id
    */
    id?: string;
    rmsId?: string;
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
     * meaning is rmsId
     * @deprecated use id
     */
    modifierId: any;
    id: string;
    rmsId: string;
}
export interface GroupModifier extends BaseModifier {
    /**
     * restocore group.id
     */
    id: string;
    rmsId: string;
    childModifiers: Modifier[];
    group?: GroupRecord | string;
    groupId?: string;
    isSingleModifierGroupWrapper?: boolean;
    /**
     * meaning is rmsId
     * @deprecated use id
     */
    modifierId: string;
}
export {};
