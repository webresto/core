# 🍔 Modifiers

Modifiers let a dish be customized at order time — extra toppings, a choice of sauce, a
required "pick your size", and so on. This document describes the **shape of the object**
that is stored in the `Dish.modifiers` field, how it is used, and the rules the admin panel
editor (the `modifiers-editor` control) validates against.

Related code:
- Interfaces — [`interfaces/Modifier.ts`](../interfaces/Modifier.ts)
- Validation / defaults helper — [`libs/ProductModifier.ts`](../libs/ProductModifier.ts)
- Populate logic — `Dish.getDishModifiers()` in [`models/Dish.ts`](../models/Dish.ts)
- JSON Schema — [`docs/schemas/modifiers.schema.json`](./schemas/modifiers.schema.json)

---

## 1. Where modifiers live

`Dish.modifiers` is a JSON column typed as `GroupModifier[]`:

```ts
// models/Dish.ts
modifiers: {
  type: "json",
} as unknown as GroupModifier[],
```

So the persisted value is **always an array of modifier groups**. Even a dish that offers a
single free-standing modifier stores it as a group with one child (see
`isSingleModifierGroupWrapper` below).

---

## 2. The three object shapes

There are three related shapes. Only the first (`GroupModifier[]`) is stored on a dish; the
other two describe the child rows and the runtime order payload.

### 2.1 `GroupModifier` — a modifier group (stored on the dish)

A group binds a catalog **Group** (a category of interchangeable modifier dishes) to a dish
and carries the min/max/required rules for the whole group.

| Field | Type | Required | Meaning |
|---|---|---|---|
| `id` | `string` | yes | restocore `Group.id` this group points at. |
| `rmsId` | `string` | yes | External RMS id of the group. May be `""` for locally-created groups. |
| `childModifiers` | `Modifier[]` | yes | The concrete modifier options in this group (may be empty transiently, but an empty group is dropped on populate). |
| `minAmount` | `number \| null` | no | Minimum total amount the guest must select from the group. `0`/`null` = optional. |
| `maxAmount` | `number \| null` | no | Maximum total amount selectable. `null` = unlimited. |
| `required` | `boolean \| null` | no | Convenience flag; equivalent to `minAmount >= 1`. |
| `defaultAmount` | `number \| null` | no | Group-level default (rarely used; per-child `defaultAmount` is preferred). |
| `freeOfChargeAmount` | `number \| null` | no | How many picks in this group are free before charging. |
| `freeAmount` | `number \| null` | no | **Deprecated** — use `freeOfChargeAmount`. |
| `amount` | `number \| null` | no | Fixed amount (legacy). |
| `isSingleModifierGroupWrapper` | `boolean` | no | `true` when the group is a synthetic wrapper around a single stand-alone modifier (no real category). |
| `group` | `GroupRecord \| string` | no | Populated at read time by `getDishModifiers()`; **not** authored by hand. |
| `groupId` | `string` | no | Alias sometimes present alongside `id`. |
| `modifierId` | `string` | no | **Deprecated** alias — historically the group's `rmsId`. Use `id`. |

### 2.2 `Modifier` — a single modifier option (a child row)

Each entry of `childModifiers` is one selectable modifier — itself a **Dish** (with
`modifier: true`).

| Field | Type | Required | Meaning |
|---|---|---|---|
| `id` | `string` | yes | restocore `Dish.id` of the modifier dish. |
| `rmsId` | `string` | yes | External RMS id of the modifier dish. May be `""`. |
| `minAmount` | `number \| null` | no | Minimum amount of this specific option. |
| `maxAmount` | `number \| null` | no | Maximum amount of this specific option. |
| `defaultAmount` | `number \| null` | no | Amount pre-selected by default (used by `fillDefault` / `ensureMinDefaults`). |
| `required` | `boolean \| null` | no | Whether this specific option must be present. |
| `freeOfChargeAmount` | `number \| null` | no | Free quantity of this option before charging. |
| `freeAmount` | `number \| null` | no | **Deprecated** — use `freeOfChargeAmount`. |
| `amount` | `number \| null` | no | Fixed amount (legacy). |
| `dish` | `DishRecord \| string` | no | Populated at read time; **not** authored by hand. |
| `modifierId` | `any` | no | **Deprecated** alias — historically the modifier's `rmsId`. Use `id`. |

### 2.3 `OrderModifier` — runtime selection (not stored on the dish)

What the frontend sends when a guest picks modifiers. Documented here for completeness; the
editor never produces this shape.

| Field | Type | Required | Meaning |
|---|---|---|---|
| `id` | `string` | yes | `Dish.id` of the chosen modifier. |
| `rmsId` | `string` | yes | External id of the chosen modifier. |
| `amount` | `number` | no | Quantity chosen (defaults to `1`). |
| `groupId` | `string` | no | `Group.id` the selection belongs to. |
| `modifierId` | `string` | no | **Deprecated** alias — use `id`. |
| `dish` | `DishRecord` | no | Populated at runtime. |

---

## 3. Canonical example

```json
[
  {
    "id": "b1f2…-group-sauce",
    "rmsId": "iiko-grp-sauce",
    "minAmount": 1,
    "maxAmount": 1,
    "required": true,
    "childModifiers": [
      { "id": "d10…-ketchup", "rmsId": "iiko-ketchup", "defaultAmount": 1 },
      { "id": "d11…-mustard", "rmsId": "iiko-mustard" }
    ]
  },
  {
    "id": "a3c4…-group-extras",
    "rmsId": "iiko-grp-extras",
    "minAmount": 0,
    "maxAmount": 5,
    "freeOfChargeAmount": 1,
    "childModifiers": [
      { "id": "d20…-cheese", "rmsId": "iiko-cheese", "maxAmount": 3 },
      { "id": "d21…-bacon", "rmsId": "iiko-bacon", "maxAmount": 2 }
    ]
  }
]
```

- **Sauce** is a required single-choice group (`minAmount: 1`, `maxAmount: 1`), ketchup
  pre-selected.
- **Extras** is optional (`minAmount: 0`), up to 5 items, the first pick free.

---

## 4. Validation rules

Enforced by [`ProductModifier`](../libs/ProductModifier.ts) at order time and mirrored by the
editor:

1. **Group `id` and `rmsId` are the anchors.** A group is identified by its `id` (restocore
   `Group.id`); an empty `childModifiers` group is dropped when the dish is populated.
2. **Per-group min/max** — the *sum* of `amount` across the guest's selections in a group must
   satisfy `minAmount ≤ Σamount ≤ maxAmount`. `minAmount < selected` throws "Minimum…",
   `selected > maxAmount` throws "Maximum…".
3. **Defaults** — `fillDefault()` adds every child with `defaultAmount > 0` that the guest
   hasn't already chosen; `ensureMinDefaults()` tops a group up to `minAmount` using default
   children first, otherwise the first child.
4. **`required`** is a convenience mirror of `minAmount >= 1`; the editor keeps the two in
   sync.
5. **`freeAmount` / `modifierId`** are accepted on read for backward compatibility but the
   editor writes the modern `freeOfChargeAmount` / `id` keys.

---

## 5. Notes for the admin editor (`modifiers-editor` control)

- The editor operates on the **stored** shape (`GroupModifier[]`) — it never emits `group` or
  `dish` populated objects, only `id` / `rmsId` references.
- Fields present in the database but **not** part of this schema (populate artifacts, unknown
  keys) are ignored by the form and preserved untouched on save where practical.
- Child modifier options are **Dishes with `modifier: true`**; the editor's picker lists them
  from the catalog. Groups are catalog **Groups**. Access to that data is gated by the
  `catalog-products` access-rights token (the same one that guards the product catalog), so a
  user who cannot see the catalog cannot enumerate modifiers.
