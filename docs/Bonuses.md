# Bonuses

Bonuses are implemented through a Bonus Program, managed by the Bonus Program model. This Bonus Program includes:

- `name`: String, required (for human visualization)
- `exchangeRate`: Number, default is 1 (Exchange price for website currency)
- `coveragePercentage`: Number, default is 1 (How much of the order's amount can be spent)
- `decimals`: Number, default is 0 (denomination)
- `description`: String

The Bonus Program should be implemented as an adapter from the abstract class `@webresto/core/adapters/bonusprogram/BonusProgramAdapter.ts` and added to the model via `BonusProgram.alive()`. The adapter is responsible for recording transactions in an external source or syncing from an external source by implementing the abstract class `BonusProgramAdapter`.

> ⚠️ Any bonus adapter must be passed to the `BonusProgram` model in the `alive()` method. Example: `await BonusProgram.alive(new LocalBonusProgramAdapter());`

> ⚠️ If yours is in production mode, then the adapter will be turned off when you turn it on for the first time

> ⚠️ Automatic user registration `automaticUserRegistration` (default for production: `false`)

> ⚠️ Bonuses will be synchronized every time the user is active but no more than `TIME_TO_SYNC_BONUSES_IN_MINUTES` (default 15 minutes)


## Check enough balance cases

Every time when there is a write-off of bonuses, the bonus program will be forcibly synchronized. And a check will be performed in the external system and, depending on the settings, a decision will be made on spending bonuses


- If userBalance equals externalBalance and externalBalance equals amount, the function returns true.
- If userBalance doesn't equal externalBalance and the setting DISABLE_BONUS_PROGRAM_ON_FAIL is enabled, it disables the bonus program and returns false
- If externalBalance is greater than amount and the setting ONLY_EXTERNAL_BONUS_SPEND_CHECK is enabled, the function returns true.
- If externalBalance and userBalance are both greater than amount, it logs an error and returns true.

## Deducting Bonus during Order

During the ordering process, bonuses can be deducted at the order check stage. For this, an object should be passed to the 'check' function, specifying the bonus amount to be deducted:

```typescript
interface SpendBonus {
  bonusProgramId: string,
  amount: number,
}
```
Multiple bonus systems may be used on the site, but only one can be applied per order. Bonuses are added during the order check and recalculated each time something changes in the order or when the checked order's validity period has expired (10 minutes).

### Bonus Deduction Strategies

There are several strategies for deducting bonuses:

1) `bonus_from_order_total`: Deduction from the final amount of the order including promotional dishes, discounts, and delivery.
2) `bonus_from_basket_delivery_discount`: Deducting bonuses from the basket total, delivery, and discounts (excluding promotional dishes).
3) `bonus_from_basket_and_delivery`: Deducting bonuses from the basket total and delivery (excluding promotional dishes and discounts).
4) `bonus_from_basket`: Deducting bonuses from the basket total (excluding promotional dishes, discounts, and delivery).

> Strategy is set in the Settings model with the key `BONUS_SPENDING_STRATEGY`.

After the bonus deduction, a record is made in the UserBonusTransaction model, and the balance is updated.

### Synchronization

- During user registration, a check will be performed to determine if the bonus system is enabled for the specific user.
- During user login, synchronization will be conducted starting from the last synchronization date.
- Additionally, each reward adapter can implement a record in the UserBonusTransaction model by its own means.

### Flow

Bonuses will be added to the order during the order check, but they will be deducted only when the order is finalized. A consistency check is performed when deducting the bonuses.

### Stability

In the event that the external bonus system fails to deduct bonuses but the site has deducted them, the UserBonusTransaction model will have a transaction record flagged as `isStable: false`. Such transactions should be handled by the bonus system adapter. In case of an error, the bonus system can be disabled from the core using the property `DISABLE_BONUSPROGRAM_ON_ERROR`.

**[todo:]** - If external system has method for check stability, core should check it after 

### User

For a user to utilize the bonus system, it needs to be enabled for them. By default, all activated bonus systems will be available to the user. However, if a bonus system is disabled for a specific user, it should be turned off from the adapter (i.e., from the external system). This is managed through the UserBonusProgram model property `active`.

Upon user creation, a request will be made to all known bonus programs to verify user registration.

A separate registration method can be used for signing up and removing the bonus program through the adapter.

### Meal concepts and exceptions
*Not implemented in current version*

Regardless of the strategy for spending bonuses, exceptions can be assigned to groups, dishes or even entire concepts, limiting the ability to spend bonuses. If such a limit is not specified, bonuses are spent according to the strategy. 

### Bonus Support in RMS Adapter

For a delivery site that sends orders to an external system, a flag should be set in the RMS adapter indicating it supports bonus spending. This means RMS will independently calculate how many bonuses are spent in the order and apply a discount to reconcile accounting. Deduction of bonuses is carried out by the bonus systems adapter.


### to do:
1. check isRegistred after create new user by FLAG settings
2. Implement syncronization transaction
3. recheck user balance, by util recheck transaction user
4. dishes and groups concepts and exceptions
