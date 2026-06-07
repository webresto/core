## 🧾 Abstract: Architecture and Role of Checkout in Order Processing

The Checkout is a critical component that bridges the user interface, business logic, and system-level constraints. It is not just the final step in placing an order—it is the adaptive layer that transforms general platform rules into a personalized, valid, and actionable transaction.

The Checkout is initially designed around **broad default configurations**, which support all possible delivery types (courier, pickup), time slots, payment methods, bonus systems, and contact options. However, the actual execution depends heavily on the context: selected concept (e.g. brand, franchise), cart contents, current time, active promotions, and more.

To handle this complexity, the system uses a two-tiered constraint model:

1. **Restrictions** – These are **global, server-level rules** that define the platform’s overall delivery capabilities. They are not location-specific, but apply to the entire system. For example:

   * Whether delivery or pickup is available;
   * Whether bonus spending is allowed;
   * Which countries are permitted for phone numbers;
   * Which contact methods are accepted.

2. **InitCheckout** – This is a context-sensitive initializer triggered upon entering the Checkout. It takes the current cart as input and returns a filtered view of delivery capabilities:

   * Available delivery time intervals;
   * Whether “as soon as possible” delivery is allowed;
   * Whether scheduled delivery is allowed;
   * Estimated cooking time;
   * Bonus banners or warnings.

This model ensures that the Checkout behaves like an **adaptive delivery engine**, capable of handling varied restaurant rules, customer preferences, and global system constraints in a unified manner.

Checkout also includes:

* Dynamic switching between pickup and delivery;
* Timezone-aware scheduling;
* Enforcement of minimum cooking and delivery times;
* Conditional bonus usage;
* Integration with user address and contact methods.

In short, Checkout is not just a form—it’s a **smart coordination layer** that matches user intent with system capabilities.

---

## 🔧 How `Restrictions` and `InitCheckout` Work – with Examples

The configuration logic in Checkout is split into two layers:

### 1. `Restrictions` – Global Server Constraints

The `Restrictions` object applies **system-wide rules**, regardless of cart or concept. These are set by administrators or backend logic and define what is globally possible.

#### Example: Restrictions disabling delivery entirely

```ts
restrictions = {
  deliveryAllowed: false,
  selfServiceAllowed: true,
  allowBonusSpending: false,
  minDeliveryTimeInMinutes: 20,
  allowedPhoneCountries: ['MX', 'CA'],
  contactMethods: ['phone', 'whatsapp'],
};
```

> Even if the cart is valid, delivery is disabled across the entire platform.

---

### 2. `InitCheckout` – Contextual Refinement

Triggered when the user opens the Checkout, `InitCheckout` takes the current cart state and returns a filtered view of the allowed actions, depending on:

* Cart contents;
* Kitchen availability;
* Concept-specific logic;
* Time of day or promotions.

#### Example InitCheckout response:

```ts
initCheckout = {
  nonce: 493482,
  worktimeIntervals: [[39600, 72000]], // 11:00–20:00 in seconds
  allowSoonAsPossible: true,
  allowOrderToTime: false,
  bonusBannerHTMLChunk: '<div>Spend your bonuses and get a discount!</div>',
  minCookingTimeInMinutes: 15,
  cookingTimeDescription: 'Prepared in 15–20 minutes',
};
```

> In this example:
>
> * Delivery “ASAP” is allowed;
> * Scheduled delivery is not;
> * Delivery is only available between 11:00 and 20:00;
> * Bonus banners are shown;
> * Minimum cooking time is 15 minutes.

#### Null semantics for `allowSoonAsPossible` and `allowOrderToTime`

Both fields use a three-value logic:

| Value   | Meaning |
|---------|---------|
| `true`  | Explicitly allowed by backend logic (e.g. a plugin or custom hook). |
| `false` | Explicitly forbidden regardless of schedule. |
| `null`  | No explicit override — frontend should decide based on `worktimeIntervals`. |

The default value returned by the server is `null` for both fields. This means:

* If the current time falls within `Restrictions.worktime` → frontend may allow “ASAP” ordering (`allowSoonAsPossible`).
* If `Restrictions.worktime` contains future intervals → frontend may allow scheduled ordering (`allowOrderToTime`).

A backend plugin can override either field to `true` or `false` via the `core:order-init-checkout` event to enforce business rules independent of the schedule.

---

### 🧠 How They Work Together

When the Checkout loads:

1. The system retrieves `Restrictions` → sets hard limits.
2. Then it calls `initCheckout(orderId)` → refines them using the cart.
3. The form is rendered with only the options that are valid under both layers.
4. User interaction is validated and constrained accordingly.

#### Example scenario:

* 🔒 Restrictions: delivery allowed only with at least 20 minutes lead time.
* 🔄 InitCheckout: kitchen currently needs 15 more minutes to prepare food.
* ✅ Total minimum delay = 35 minutes → used in validation.

This logic is enforced by validators like:

```ts
earlyDeliveryTimeValidator(restrictions, initCheckout)
requiredDeliveryDateValidator(initCheckout)
```

They ensure:

* The user cannot select a time that violates minimum cooking + delivery time;
* If no time options are available, the user is properly warned;
* The system remains predictable and aligned with operational constraints.


### 🔌 Intercepting InitCheckout: `core:order-init-checkout`

If you need to **intercept or modify the InitCheckout process**, the system provides a lifecycle event you can hook into using the global event emitter.

#### Event: `core:order-init-checkout`

This event is emitted **before returning the final `InitCheckout` result** to the frontend. It allows you to adjust or extend the computed values based on:

* cart contents,
* business rules,
* third-party integrations (e.g. kitchen load, marketing campaigns),
* custom restrictions per concept or group.

#### Usage Example:

```ts
emitter.on('core:order-init-checkout', (initCheckout, cart) => {
  if (cart.concept === 'express') {
    initCheckout.minCookingTimeInMinutes = 5;
    initCheckout.cookingTimeDescription = 'Express dishes ready in 5 minutes!';
  }

  if (cart.total > 5000) {
    initCheckout.bonusBannerHTMLChunk = '<b>🎉 You qualify for bonus cashback!</b>';
  }
});
```

> This pattern ensures `InitCheckout` remains extensible and responsive to dynamic business logic without needing to hardcode everything on the frontend.

You can emit and listen to this event anywhere in your backend logic where the emitter instance is available.