# Adapters

An adapter is the boundary of core. The abstract class is the contract core
calls; the default implementation is the behaviour core ships until someone
replaces it. What an implementation does inside is its own business — core only
talks to the contract.

These rules cover `geo`, `delivery` and `menu`. The other kinds (RMS, payment,
bonus program, OTP, captcha, media file, promotion, auth) keep their own loaders
in `index.ts` and are not held to them.

## Rules

### 1. One active adapter per kind

A kind has exactly one adapter at a time: the default or a replacement, chosen by
a setting. There is one registry for all three kinds and no per-kind singletons:

```ts
Adapter.register(kind, name, instance) // core has "default" from the first call; a module registers its own in its hook
Adapter.get(kind)                      // name from the kind's setting; empty is "default"; unknown is an error
Adapter.isDefault(kind)                // whether the built-in implementation is the active one
```

| Kind | Setting |
|---|---|
| `geo` | `GEO_ADAPTER` |
| `delivery` | `DELIVERY_ADAPTER` |
| `menu` | `MENU_PLACE_BASED_MODE` |

A mode of the default implementation is the same instance registered under one
more name — `single-place` for the menu — not a second class.

### 2. The abstract class is the contract

- It declares everything core calls. A method is `abstract` when core cannot go on
  without an answer; it has a body returning a neutral answer (`null`, nothing)
  when core has a way on without one.
- It may carry core's own rules as concrete methods — rules that are the same for
  every implementation, built from the contract, core models and `lib/` helpers.
  An implementation may override such a method and call `super`.
- It never touches a model owned by an adapter and never depends on how one
  implementation works: a geocoder, zone geometry, the shape of a catalog.

### 3. The default implementation is not extended

- It owns its models, its storage, its external services and its admin pages.
- `extends Default<X>` is forbidden. A replacement extends the abstract class and
  implements what the abstract class demands — the compiler lists it.
- Reuse goes through plain functions in `lib/<x>/`, which anyone may import, not
  through inheritance.

### 4. Models

- Core models (`Place`, `Settings`, `Dish`, `Order`, …) are read by any adapter.
- A model owned by an adapter is touched only by that adapter's default
  implementation and its admin pages. Sails keeps every model in `models/`, so
  ownership is a convention, and the test below holds it.

| Model | Owner |
|---|---|
| `Address` | `geo` |
| `DeliveryZone` | `delivery` |

`menu` owns no model.

- The admin page of an owned model is shown only while the owner's default is
  active (`Adapter.isDefault(kind)`): with another implementation the rows are data
  nothing reads.

### 5. Layout

- `adapters/<x>/<X>Adapter.ts` — the abstract class; `adapters/<x>/default/` — the
  default implementation. Nothing else in `adapters/<x>/`.
- Plain helpers — `lib/<x>/`; types — `interfaces/`.
- Code outside `adapters/` imports an adapter only through `adapters/index.ts`.
  The exceptions are the owner of a model: the model file and the admin pages of
  a default implementation import that implementation. Core's boot starts what
  the default delivery adapter keeps running through `startDefaultDelivery`,
  exported by `index.ts`.

## The three kinds

**geo.** Contract: `locate`, `addressByCoordinate`, `search`, `path` and
`describe` (the line `Order` saves and whether it still needs a house number).
Default: the `Address` catalog, its node type lists (`ADDRESS_TYPES` and the
rest, read by `Address` itself) and Nominatim.

**delivery.** Contract: `calculate`, `checkAbility`; with a body — `estimateTravel`,
`reset`, `resolvePlaceForCoordinate` (`null`: the kitchen chain moves on). What
core reads off a result is a field of `Delivery`: `zoneName` for the operator
screens, `notConfigured` for checkout. Default: zones, their cache, import, KML
sync and the `has_delivery_zone` setup checkup.

**menu.** Contract: `resolvePlaces`. Core rules in the abstract class:
`resolveContext`, `filterProducts`, `canAddProduct`, `placeLines` (one kitchen),
`resolveCookingPlace` (the `KITCHEN_RESOLVE_CHAIN`), `adjustDelivery` (nothing
added). Default: the `default` and `single-place` modes.

Multi-kitchen route is not in core. The `multi-place-router` module is one menu
adapter: `resolvePlaces` names the primary kitchen and the other open ones,
`placeLines` spreads the basket over them, `adjustDelivery` charges the extra legs.
Filtering, the basket check and stock come from the abstract class unchanged.

## Do and don't

Do:

- write a replacement by extending the abstract class;
- reuse `lib/<x>/` helpers;
- read core models where the answer needs them;
- put a rule into the abstract class only when every implementation must answer
  it the same way.

Don't:

- extend a default implementation;
- read `Address` or `DeliveryZone` outside their owner's default;
- read another implementation's diagnostics as data — a fact core needs is a field
  of the contract;
- import `adapters/<x>/…` from outside `adapters/`;
- add a registry, a singleton or a loader next to `Adapter`;
- add a method to a contract before core has a call for it.

`test/unit/adapter-imports.test.ts` holds the layout and the imports; there is no
linter.
