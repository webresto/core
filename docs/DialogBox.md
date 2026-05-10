## DialogBox

### Introduction

`DialogBox` is a mechanism for asking a connected client (frontend / device) a question and awaiting the user's answer on the backend. The backend builds a dialog config, broadcasts it via the global event emitter, and `await`s a response. If no answer arrives within the timeout, an optional `defaultOptionId` is returned, otherwise `null`.

`DialogBox` is exposed as a global at boot ([hook/initialize.ts](../hook/initialize.ts)), so you can use it anywhere in the project as `DialogBox.ask(...)` without an import.

### Contents

1. **`DialogBox` class** — [libs/DialogBox.ts](../libs/DialogBox.ts)
   - The constructor is `private`. Dialogs are always created through `DialogBox.ask(...)`.
   - Active dialogs are stored in the static map `DialogBox.dialogs` keyed by `askId`.

2. **Static methods**
   - `DialogBox.ask(config, deviceId, timeout?)` — validates the config against the JSON schema [`libs/schemas/dialogBoxConfig.json`](../libs/schemas/dialogBoxConfig.json), creates a dialog, emits `dialog-box:new`, and polls for the answer every 500 ms until it arrives or the timeout expires.
     - `config: DialogBoxConfig` — the dialog payload (see below).
     - `deviceId: string` — target device that should display the dialog.
     - `timeout?: number` — milliseconds to wait. Defaults to `30_000` (30 seconds).
     - **Returns** `Promise<string | null>` — the `id` of the chosen option, the `defaultOptionId` if the timeout fires and a default is configured, or `null`.
   - `DialogBox.answerProcess(askId, answerId)` — called by the transport layer when the frontend sends an answer back. It writes `answerId` into the active dialog and emits `dialog-box:answer-received`. The pending `ask()` call resolves on its next poll tick.

3. **Events** (see [docs/AwaitEmitterEvents.md](AwaitEmitterEvents.md))
   - `dialog-box:new` — payload `[DialogBox]`. Fires when a new dialog is created. Channels/transports listen for this to deliver the dialog to the user.
   - `dialog-box:answer-received` — payload `[askId, answerId]`. Fires when an answer is registered.

### Configuration (`DialogBoxConfig`)

Defined in [interfaces/DialogBox.ts](../interfaces/DialogBox.ts). Common fields:

| Field | Type | Required | Default | Description |
|---|---|---|---|---|
| `title` | `string` | yes | — | Dialog title. |
| `message` | `string` | yes | — | Body text shown to the user. |
| `optionsType` | `"button" \| "product"` | yes | — | Discriminator for the shape of `options`. |
| `options` | `DialogOption[]` | yes | — | Must contain at least one entry (at least two for `product`). |
| `askId` | `string` | no | auto `uuid()` | Stable identifier; pass it in if you need to correlate the dialog with an external state machine. |
| `allowClosing` | `boolean` | no | `true` | If `false`, the user must pick an option — the frontend should hide the close affordance. |
| `type` | `"routine" \| "critical"` | no | `"routine"` | `critical` is reserved for important events the UI should highlight. |
| `timeout` | `number` | no | — | Hint for the frontend to fade the dialog away. Independent of the backend `timeout` argument of `ask()`. |
| `defaultOptionId` | `string` | no | — | Returned if the backend timeout elapses with no answer. Also the option the frontend should preselect. |
| `emitTime` | `number` | no | set by `ask()` | Unix seconds when the dialog was emitted; populated automatically. |

#### Button options (`optionsType: "button"`)

Each option:

```ts
{
  id: string;        // returned as the answer
  label: string;     // legacy field, kept for compatibility
  button: {
    label: string;   // text shown on the button (required by the JSON schema)
    type: "primary" | "secondary" | "link" | "abort";
  };
}
```

Recommended button-type ordering when the frontend has to choose styles automatically:
- 4 buttons → primary, secondary, link, abort
- 3 buttons → primary, secondary, abort
- 2 buttons → primary, secondary
- 1 button → primary

#### Product options (`optionsType: "product"`)

Used to ask the user to pick one item from a list of dishes. Each option:

```ts
{
  id: string;
  label: string;
  product: DishRecord;   // a Dish model record
}
```

The schema requires **at least two** product options.

### Usage Examples

#### Example 1: Confirmation dialog (button options)

A confirmation shown before placing a catering order:

```ts
const dialogConfig = {
  allowClosing: false,
  type: "routine",
  title: "Create a catering order",
  message:
    "Catering orders require 24 hours' notice and are subject to a minimum " +
    "order amount. The order is only considered accepted after our staff " +
    "contacts you to confirm it.",
  optionsType: "button",
  timeout: 30,
  defaultOptionId: "clearCartAndAdd",
  options: [
    {
      id: "createCattering",
      label: "I have read this and want to place the order",
      button: {
        label: "I have read this and want to place the order",
        type: "primary",
      },
    },
    {
      id: "cancelCreateCattering",
      label: "Cancel",
      button: {
        label: "Cancel adding",
        type: "secondary",
      },
    },
  ],
} as const;

const answerId = await DialogBox.ask(dialogConfig, deviceId, 60_000);

switch (answerId) {
  case "createCattering":
    // user accepted — proceed
    break;
  case "cancelCreateCattering":
  case null:
    // user cancelled or no device picked it up
    break;
}
```

Note that the dialog's own `timeout` (used by the frontend countdown) and the backend `timeout` argument of `ask()` are separate values.

#### Example 2: Critical confirmation with a default

```ts
const answerId = await DialogBox.ask({
  type: "critical",
  allowClosing: false,
  title: "Order cancellation",
  message: "Cancel order #1024? This cannot be undone.",
  optionsType: "button",
  defaultOptionId: "no",
  options: [
    { id: "yes", label: "Yes", button: { label: "Yes, cancel", type: "primary" } },
    { id: "no",  label: "No",  button: { label: "Keep order",  type: "abort"   } },
  ],
}, deviceId, 45_000);

if (answerId === "yes") {
  await Order.cancel(orderId);
}
```

If the device never answers within 45 seconds, `answerId` resolves to `"no"` (the `defaultOptionId`).

#### Example 3: Product picker

```ts
const answerId = await DialogBox.ask({
  title: "Choose a replacement",
  message: "The dish you ordered is unavailable. Pick a replacement:",
  optionsType: "product",
  options: [
    { id: "dish-a", label: "Dish A", product: dishA },
    { id: "dish-b", label: "Dish B", product: dishB },
  ],
}, deviceId);

// answerId === "dish-a" | "dish-b" | null
```

#### Example 4: Handling an answer from the transport layer

When the frontend posts an answer back, the transport (HTTP controller / socket handler) forwards it to the dialog:

```ts
// inside an action that receives { askId, answerId } from the client
DialogBox.answerProcess(askId, answerId);
```

The pending `DialogBox.ask(...)` call will resolve on its next poll tick (≤ 500 ms).

### Localization

`DialogBox` is **locale-agnostic**. The config has no `locale` / `language` field, and `DialogBox.ask()` does not run `title`, `message`, or `button.label` through the i18n hook. Whatever strings the caller passes in are delivered to the device verbatim.

A few consequences worth knowing:

- The dialog is addressed only by `deviceId` — there is no `userId` in the config, so `ask()` cannot look up a user's language on its own.
- The `user: UserRecord` field on the `DialogBox` instance ([libs/DialogBox.ts:14](../libs/DialogBox.ts#L14)) is currently never populated by `ask()`. Don't rely on it.
- The user's language preference lives elsewhere — typically `Order.locale` ([models/Order.ts:164](../models/Order.ts#L164)), with the site's default locale as a fallback.

**The caller is responsible for translating strings before calling `ask()`.** Resolve the locale, translate every visible string (including each `button.label`), then build the config:

```ts
const locale =
  order?.locale ??
  sails.config.i18n?.defaultLocale ??
  "en";

const t = (phrase: string) => sails.__({ phrase, locale });

const answerId = await DialogBox.ask({
  allowClosing: false,
  type: "routine",
  title: t("Create catering order"),
  message: t("Order in 24 hours. Minimum order amount is 2000 rubles."),
  optionsType: "button",
  defaultOptionId: "cancel",
  options: [
    {
      id: "ok",
      label: t("I read it, create the order"),
      button: { label: t("I read it, create the order"), type: "primary" },
    },
    {
      id: "cancel",
      label: t("Cancel"),
      button: { label: t("Cancel adding"), type: "secondary" },
    },
  ],
}, deviceId, 60_000);
```

Translation keys should be added to [translations/en.json](../translations/en.json) and [translations/ru.json](../translations/ru.json) (and any other locales the project supports).

### Errors and validation

`DialogBox.ask()` throws synchronously when:
- `dialog` is falsy → `DialogBox config not defined [...]`.
- `deviceId` is falsy → `deviceId not defined [...]`.
- `options` is empty → `Options for DialogBox should be defined`.
- The config fails JSON schema validation → `DialogBox config not valid: <ajv errors>`. Validation errors are also written to `sails.log.error`.

Wrap calls in `try/catch` if the config is built from user-controlled data.
