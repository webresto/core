import { GroupModifier, OrderModifier } from "../interfaces/Modifier";
export declare class ProductModifier {
    private productModifiers;
    constructor(productModifiers: GroupModifier[]);
    validate(orderModifiers: OrderModifier[]): void;
    private validateGroupOrThrow;
}
