export interface IconfigDiscount {
    discountType: "flat" | "percentage";
    /**
     * The discount will be applied to the cart, if you specify `dishes` and `groups` then the discount will be applied only if at least one dish is present in the cart
     */
    promotionFlatDiscount?: number;
    discountAmount: number;
    dishes: string[];
    groups: string[];
    /** // TODO: implement excludeModifiers
     * examples:
     * Buy cofee for $1 with 20% discount and modifier milk for $0.5 without this discount.
     * excludeModifiers: true  $1.30
     * excludeModifiers: false  $1.20
     * by default modifiers will be calculated with discount
     */
    excludeModifiers?: boolean;
}
