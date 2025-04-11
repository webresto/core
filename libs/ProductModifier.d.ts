import { GroupModifier, OrderModifier } from "../interfaces/Modifier";
interface ValidationResult {
    groupId: string;
    valid: boolean;
    error?: string;
}
export declare class ProductModifier {
    private productModifiers;
    constructor(productModifiers: GroupModifier[]);
    fillDefault(orderModifiers: OrderModifier[]): OrderModifier[];
    validate(orderModifiers: OrderModifier[]): ValidationResult[];
    private validateGroup;
}
export {};
