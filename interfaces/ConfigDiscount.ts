export interface IconfigDiscount {
    discountType: "flat" | "percentage",

    /**
     * The discount will be applied to the cart, if you specify `dishes` and `groups` then the discount 
     * will be applied only if at least one dish is present in the cart 
     * 
     * If you have selected discountType: "flat" + discountAmount then the promotionFlatDiscount field will be ignored
     * 
     * @deprecated please use `discountType: "flat" + discountAmount`
     */
    promotionFlatDiscount?: number,
    
    discountAmount: number,
    dishes: string[] | null,
    groups: string[] | null,
    /** // TODO: implement excludeModifiers
     * examples:
     * Buy cofee for $1 with 20% discount and modifier milk for $0.5 without this discount.
     * excludeModifiers: true  $1.30
     * excludeModifiers: false  $1.20
     * by default modifiers will be calculated with discount
     */
    excludeModifiers?: boolean; 
    deliveryMethod?: ("delivery"|"selfService")[]
  }