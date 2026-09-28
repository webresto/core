export interface IconfigDiscount {
    discountType: "flat" | "percentage",
    discountAmount: number,

    /**
     * The discount will be applied to the cart, if you specify `dishes` and `groups` then the discount
     * will be applied only if at least one dish is present in the cart
     */
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
    /** Which service types the promotion applies to. Empty or absent — any of them. */
    serviceType?: ("delivery"|"pickup"|"dine-in")[]
    /**
     * Minimum basket total (user dishes only) required for this promotion to be
     * applied **via a promocode**. Checked in condition(order, viaPromocode=true).
     * For a gift promotion `gift.minBasketTotal` takes precedence over this.
     * Ignored for automatic (non-promocode) application.
     */
    minBasketTotal?: number,
    /** Exclude rules for dish or group */
    exclude?: {
      dishes?: string[] | null,
      groups?: string[] | null,
    }
    /**
     * Gift: auto-add dishes to the cart for free when the basket reaches a threshold.
     * Re-evaluated on every cart recount; gift dishes are added with addedBy:"promotion"
     * (removed by clearOfPromotion before each recount), so dropping below
     * `minBasketTotal` automatically removes the gift.
     *
     * The "free" price is provided by the dish itself (use a 0₽ dish). A gift-only
     * promotion may omit `discountType`/`discountAmount`/`dishes`/`groups`.
     *
     * example: { minBasketTotal: 1449, dishes: [{ dishId: "magnet-id", amount: 2 }] }
     */
    gift?: {
      /**
       * Minimum basket total (user dishes only) required for the gift.
       * Takes precedence over the top-level `minBasketTotal` (first defined wins,
       * not max). Checked in condition(order, viaPromocode=true), which gates the
       * whole promotion (gift + any discount in the same config).
       */
      minBasketTotal: number,
      dishes: { dishId: string, amount: number }[],
    }
  }