## Setup Checklist

### Introduction

The Setup Checklist is a runtime catalog of **checkups** — things a project owner should
complete to finish configuring the system (fill required settings, set bot tokens, enable a
payment method, upload a logo, …). It powers the admin page **System → Setup checklist**
(`/admin/setup-checklist`).

Key properties:

- **Runtime / in-memory.** Checkups live only in RAM, on a `globalThis` singleton (survives
  hot-reload), exactly like `NotificationEventRegistry`. Nothing about the definitions is
  persisted.
- **Live evaluation.** Each checkup carries a `check()` handler that runs on **every** status
  request — results are never cached. Reload the page and everything is re-evaluated.
- **Non-blocking.** The checklist only informs and links the operator to the right page. It
  blocks nothing.

The only persisted piece of the whole feature is the per-item dismissal map
(`Settings["SETUP_CHECKLIST_DISMISSED"]`).

### Contents

`SetupChecklistRegistry` (write API, called by core and by modules):

- `registerGroup(def: CheckupGroupDefinition)` — register/merge a group (idempotent by key).
- `registerCheckup(def: CheckupDefinition)` — register/merge a single checkup.
- `registerCheckups(defs: CheckupDefinition[])` — batch register.
- `unregisterCheckup(key)` / `unregisterGroup(key)` — remove (a removed group re-homes its
  checkups to the fallback group, never drops them).
- `listGroups()` / `listCheckups()` / `getCheckup(key)` / `getGroup(key)` / `listByGroup(key)`.

`SetupChecklistService` (live evaluation, used by the HTTP layer):

- `getStatus(ctx)` — runs every `check()` in parallel (with per-check timeout + isolation),
  groups results, computes severity counts, `overallReady` and a weighted `progressPercent`.
- `getSummary(ctx)` — lightweight aggregate for a global indicator.
- `dismiss(key, { snoozeDays? })` / `restore(key)` — hide/snooze a non-required checkup
  (required checkups can never be dismissed).

Both are exported from the package: `import { SetupChecklistRegistry } from "@webresto/core"`.

### Registering checkups from a module

A module registers its groups and checkups from its own boot hook. Register **after**
`Adminpanel:loaded` if you also append i18n strings (so `adminizer.i18n.appendLocale` is
available). Registration is idempotent, so re-running it on hot-reload is safe.

#### Example 1: A module adds a group with several checkups

```ts
import { SetupChecklistRegistry } from "@webresto/core";

// 1) A group to hold the module's checkups (optional — without it, items fall into "Other").
SetupChecklistRegistry.registerGroup({
  key: "telegram_bot",            // unique snake_case
  titleKey: "Telegram bot",       // admin i18n key (English phrase = key, see i18n note)
  icon: "smart_toy",              // material icon (optional)
  sortOrder: 10,
  sourceModule: "telegram-bot",
});

// 2) The checkups.
SetupChecklistRegistry.registerCheckups([
  {
    key: "telegram_bot_token",
    group: "telegram_bot",
    severity: "required",                       // required | recommended | optional
    titleKey: "Bot token",
    descriptionKey: "Paste the token from @BotFather",
    sourceModule: "telegram-bot",
    // Where to send the operator to fix it. For settings, deep-link by setting key (#KEY):
    // settings-manager selects/scrolls to that field on load.
    target: { url: "/settings-manager#TELEGRAM_BOT_TOKEN" },
    // The live check. Keep it fast and side-effect-free (see Important Notes).
    check: async () => !!(await Settings.get("TELEGRAM_BOT_TOKEN")),
  },
  {
    key: "telegram_bot_photo",
    group: "telegram_bot",
    severity: "recommended",
    titleKey: "Bot photo",
    sourceModule: "telegram-bot",
    target: { url: "/settings-manager#TELEGRAM_BOT_PHOTO" },
    check: async () => !!(await Settings.get("TELEGRAM_BOT_PHOTO")),
  },
]);
```

#### Example 2: A check that returns a value / hint (not just true/false)

`check()` may return a plain `boolean`, or a `CheckupCheckResult` object to surface the
current value or an explanatory hint on the page. `status` is optional — when omitted it is
inferred from `progress`, otherwise it defaults to `"todo"`.

```ts
SetupChecklistRegistry.registerCheckup({
  key: "delivery_zones",
  group: "delivery",
  severity: "recommended",
  titleKey: "Delivery zones",
  target: { url: "/model/deliveryzone" },
  check: async () => {
    const total = await DeliveryZone.count();
    if (total === 0) return { status: "todo", detailKey: "No zones created yet" };

    const enabled = await DeliveryZone.count({ enable: true });
    if (enabled === 0) {
      // created ≠ ready: a zone exists but none is enabled → still "not ready"
      return { status: "todo", detailKey: "{count} created, none enabled — not ready", detailParams: { count: total } };
    }
    return { status: "done", detailKey: "{count} of {total} enabled", detailParams: { count: enabled, total } };
  },
});
```

Result fields:

| Field | Meaning |
|---|---|
| `status` | `"done" \| "todo" \| "in_progress" \| "error" \| "skipped"`. Optional; inferred from `progress`, else `"todo"`. |
| `progress` | `{ done, total }` — renders a partial-progress hint; `done >= total` ⇒ `in_progress`/`done`. |
| `detail` | An already-localized string to show under the title (e.g. the current value). |
| `detailKey` + `detailParams` | An admin i18n key + interpolation params; localized server-side (preferred for translatable hints). |

A returned `boolean` is shorthand: `true → { status: "done" }`, `false → { status: "todo" }`.

#### Example 3: Dynamic target and fully dynamic title

```ts
SetupChecklistRegistry.registerCheckup({
  key: "primary_place_worktime",
  group: "places",
  severity: "recommended",
  // Resolver instead of a static i18n key — gets the request context (locale, t, now).
  title: (ctx) => ctx.t("Working hours"),
  target: (ctx) => ({ url: "/model/place" }),   // may return null to omit the button
  check: async () => (await Place.count({ enable: true })) > 0,
});
```

### i18n

Titles/descriptions and `detailKey`s are **admin message keys**. The admin panel uses the
English phrase as the key (e.g. `"Bot token"`); on locales where you provide a translation it
is shown, otherwise it falls back to the key (English). Ship your translations and load them
with the same mechanism core uses:

```ts
adminizer.i18n.appendLocale("ru", { "Bot token": "Токен бота", "Bot photo": "Фото бота" });
```

The status API resolves these keys server-side using the request locale, so the page receives
already-localized text.

### Important Notes

- **`check()` must be fast and side-effect-free.** It runs on every status request (and there
  is no caching). Read `Settings` / model `count()`s; do **not** call slow external APIs
  synchronously here. If you need an external probe, cache it in your module and read your
  cache inside `check()`.
- **Failures are isolated.** Each check runs with a timeout (`SETUP_CHECKLIST_CHECK_TIMEOUT_MS`,
  default 3000ms) and `try/catch`; a throwing or slow check is reported as `status: "error"`
  and never breaks the page or other checks.
- **Keys are snake_case** and unique. Re-registering an existing key overwrites it (hot-reload
  safe).
- **`dismissible`** defaults to `false` for `required` and `true` otherwise. Required checkups
  can never be dismissed/snoozed.
- **The checklist blocks nothing** — it is purely informational/navigational.

See also the design notes in `ai-notes/setup-checklist.md`.
