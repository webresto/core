export interface IconfigDiscount {
    discountType: "flat" | "percentage";
    discountAmount: number;
    dishes: string[];
    groups: string[];
    /** examples:
     * Buy cofee for $1 with 20% discount and modifier milk for $0.5 without this discount.
     * excludeModifiers: true  $1.30
     * excludeModifiers: false  $1.20
     * by default modifiers will be calculated with discount
     */
    excludeModifiers: boolean;
}
