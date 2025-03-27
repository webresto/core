# Configured discount

### How it works


### Example

1. The discount will be applied to the cart, if you specify `dishes` and `groups` then the discount will be applied only if at least one dish is present in the cart

```
{ 
  configDiscount: {
    discountType: "flat",
    discountAmount: 0,
    promotionFlatDiscount: 100
    dishes: [],
    groups: [],
    excludeModifiers: true
  }
}
```