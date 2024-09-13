interface BaseModifier {
    /**
     * restocore dishId
    */
    modifierId: string;
    amount?: number;
    dish?: Dish | string;
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
export interface OrderModifier {
    id: string;
    /**
     * Default for amount is 1
     * This will be changed in a future version to have stricter rules
     */
    amount?: number;
    dish?: Dish;
    modifierId?: string;
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
    group?: Group | string;
    groupId?: string;
    isSingleModifierGroupWrapper?: boolean;
}
export {};
