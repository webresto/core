# Bonuses

The rewards are implemented as a rewards program which can be managed through the rewards program model. This rewards program includes:

  - `name`: String, required (for human visualization)
  - `exchangeRate`: Number, default is 1 (Exchange price for website currency)
  - `coveragePercentage`: Number, default is 1 (How much can you spend from the amount of the order)
  - `decimals`: Number, default is 0 (denomination)
  - `description`: String

The rewards program must be implemented as an adapter from an abstract class (@webresto/core/adapters/bonusprogram/BonusProgramAdapter.ts) and added to the model through 'alive'. The adapter itself performs the recording of transactions in an external source or synchronization from an external source by implementing the abstract class `BonusProgramAdapter`.

## Spending of rewards during the order

During the order, rewards can be deducted during the order check. For this, an object must be passed to the 'check' function, indicating what rewards to deduct:

```
interface OrderBonus {
  bonusProgramId: string,
  amount: number,
}
```

Note: Multiple rewards systems may be used on the site, but only one can be applied to an order.

Rewards must be added during the order check and recalculated each time something changes in the order or when the validity period of the checked order has expired (10 minutes).

Bonus spending strategies:
1) 'bonus_from_order_total': (default) Deduction from the final amount of the order including promotional dishes, discounts and delivery.
2) 'bonus_from_basket_delivery_discount': Writing off bonuses from the amount of the basket, delivery and discounts (not including promotional dishes).
3) 'bonus_from_basket_and_delivery': Writing off bonuses from the amount of the basket and delivery (not including promotional dishes, discounts).
4) 'bonus_from_basket': Write-off of bonuses from the amount of the basket (not including promotional dishes, discounts and delivery).

After the deduction of rewards, a record is made in the UserBonusTransaction model, and the balance is updated.

### Synchronization

- During user registration, a check will be performed to see if the rewards system is enabled for a specific user.
- During user login, synchronization will be performed starting from the last synchronization date.
- Also, each reward adapter can implement a record in the UserBonusTransaction model by its own means.
