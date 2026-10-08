## Sales Channels

### Introduction

A sales channel is one backend client that can create orders: a website, a messenger bot, a
kiosk. Channel **types** (`web-storefront`, `telegram-bot`, …) live in the in-memory
`SalesChannelRegistry`; configured **instances** are `SalesChannel` records.

Channels come from provider modules. The operator installs a provider module from the
marketplace (Store → Sales Channels → "Install from marketplace"), the module registers itself
on boot, and its channel appears switched off with the status "Needs setup" and a "Set up"
button. The operator finishes the setup on the provider's settings page, the provider reports
"ready", and the operator switches the channel on.

Rules core enforces on every write path (admin UI, HTTP API, MCP):

- A channel exists only for a type whose provider is **alive** (its adapter is registered in
  this process). A channel without a live provider never works; the admin card says why and
  offers "Install provider".
- `status` is the provider's readiness (`ready` / `needs_setup` / `error`), `enabled` is the
  operator's switch. Only an **active** channel — enabled, `ready`, provider alive — takes
  orders (`SalesChannel.resolve`), counts in the setup checklist and in widgets.
- A channel can be switched on only when the provider answers `ready` right now
  (409 "Finish setup first").
- One provider module per type; it serves every channel of the type. The operator adds more
  channels on the "Custom channel" screen if the type allows `supportsMultipleInstances`.
- A platform (`orderedOnPlatform` value) belongs to at most one channel.
- A provider's own channel cannot be deleted while the module is installed, only switched off.
  When the module is uninstalled, its untouched channels and operator-created channels of its
  types are deleted; a provider channel the operator edited stays, switched off.
- Core types without a provider in the marketplace carry `comingSoon: true` and cannot be
  created. The flag disappears once a provider registers the type.

### Writing a provider module

Extend `SalesChannelAdapter` (`@webresto/core/adapters/sales-channel/SalesChannelAdapter`) and
call `SalesChannel.alive()` from the module's boot hook:

```ts
const SalesChannelAdapter = require("@webresto/core/adapters/sales-channel/SalesChannelAdapter").default;

class TelegramBotChannel extends SalesChannelAdapter {
  constructor() {
    super({
      type: {
        type: "telegram-bot",
        title: "Telegram bot",
        category: "messenger",
        providerModule: "sales-channel-telegram", // this module's appId
        marketplaceAppId: "sales-channel-telegram",
        settingsUrl: `${routePrefix}/telegram-bot/setup`,
        supportsMultipleInstances: true,
        capabilities: ["orders:create", "menu:browse"],
      },
      // Used only when core creates the first channel record.
      defaults: { key: "telegram", title: "Telegram bot", platforms: ["telegram"] },
    });
  }

  // Required. Readiness of THIS channel; core calls it often with a ~3 s timeout,
  // so cache expensive checks (network calls) on your side.
  async getStatus(channel) {
    const token = channel.secretsRef?.token;
    if (!token) return { status: "needs_setup", message: "Bot token is not set" };
    return (await this.tokenIsValid(token)) ? { status: "ready" } : { status: "error", message: "Bot token was revoked" };
  }

  // Optional. Called before the record is deleted (by the operator or on uninstall).
  async onChannelDeleted(channel) {
    await this.dropWebhook(channel);
  }
}

if (typeof SalesChannel?.alive === "function") {
  await SalesChannel.alive(new TelegramBotChannel());
} else {
  SalesChannelRegistry.registerType(/* same type definition */); // older cores
}
```

What core does with it:

- `alive()` registers the type definition (replacing the core one) and keeps the adapter in
  memory in every PM2 worker. In worker 0 it creates the provider's channel once (disabled,
  `needs_setup`, `managedBy: "provider"`) or adopts an existing record of the same type and
  provider, then stores the first status. Later boots only refresh `status`, and only when it
  changed. Operator fields are never touched.
- `getStatus()` is asked on every channel read, before switching a channel on and by the setup
  checklist. Exceptions and timeouts become `error` with the exception text / "Provider did not
  respond". `message` is shown on the card (English; core passes it through i18n).
- Call `SalesChannel.refreshStatus(type)` after your own events (a finished build, a saved
  token) so the card updates at once.

Contract for each channel:

- "Set up" opens `settingsUrl?channel=<id>`. A provider with a single channel may ignore it.
- Keep secrets in `SalesChannel.secretsRef` (never sent to the admin UI) or in your own storage
  keyed by the channel id. Do **not** write operator fields (`title`, `settings`,
  `publicConfig`, …): an edited provider channel is kept on uninstall.
- Send orders with `orderedOnPlatform` = your channel's `key` when you serve several channels;
  a shared platform cannot tell them apart.

### No install wizard steps

A channel provider module has **no** `installSteps/`. Everything the operator configures lives
on the provider's settings page (`settingsUrl`), and readiness is whatever `getStatus()`
reports — not whether a wizard was completed. The `installSteps/` mechanism stays for modules
that really need it (e.g. `demo-mode`).

### Marketplace

Tag the module in `package.json` `keywords` with `sales-channel` and `sales-channel:<type>`:
Store → Sales Channels links to the catalog filtered by these tags ("All sales channels in
marketplace", "Search the marketplace" on a "Coming soon" type), and "Install provider" opens
the exact module by `marketplaceAppId` (`/admin/modules/catalog?appId=<appId>`).

See also `ai-notes/sales-channels-research.md` in the restoapp repository.
