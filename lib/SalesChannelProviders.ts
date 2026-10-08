/**
 * SalesChannelProviders
 *
 * One place for the "a channel exists only with its provider" rules (see models/SalesChannel.ts
 * and ai-notes/sales-channels-research.md §8.2), shared by the admin API, MCP tools and the
 * setup checklist so they cannot drift apart:
 *  - installed — the provider's Module record exists, is not soft-deleted and not disabled
 *    (app-manager removes modules softly). Used by the catalog to offer "Install provider".
 *  - alive     — the provider registered an adapter for the channel type in this process
 *    (SalesChannel.alive). Creating, enabling, settings links and the checklist look at this.
 *  - active    — enabled + provider-reported `ready` + alive (SalesChannel.isActive).
 */

import { SalesChannelRegistry, SalesChannelTypeDefinition } from "./SalesChannelRegistry";
import type { SalesChannelRecord } from "../models/SalesChannel";
import type { SalesChannelStatusResult } from "../adapters/sales-channel/SalesChannelAdapter";
import type { CheckupDefinition, CheckupTarget } from "./SetupChecklistRegistry";

/** A rule refused the operation. `error` is an English i18n key, `params` fill its {placeholders}. */
export interface SalesChannelRefusal {
  status: number;
  error: string;
  params?: Record<string, string>;
  /** Extra fields for the response body (settingsUrl, marketplaceAppId, provider message). */
  extra?: Record<string, unknown>;
}

/** Fill {placeholders} of a refusal; `t` translates the key first when given. */
export function refusalText(refusal: SalesChannelRefusal, t?: (key: string) => string): string {
  let text = t ? t(refusal.error) : refusal.error;
  for (const [name, value] of Object.entries(refusal.params || {})) text = text.split(`{${name}}`).join(value);
  return text;
}

function stringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((x) => typeof x === "string" && x.trim()).map((x: string) => x.trim()) : [];
}

/**
 * appIds of installed provider modules. `null` when the Module model is absent (minimal
 * install without app-manager): "unknown", callers must not downgrade behaviour on it.
 */
export async function getInstalledProviderAppIds(): Promise<Set<string> | null> {
  try {
    const ModuleModel: any = (sails as any).models?.module;
    if (!ModuleModel?.find) return null;
    const installed = new Set<string>();
    for (const m of (await ModuleModel.find({})) as any[]) {
      if (m?.appId && m.isDeleted !== true && m.enable !== false) installed.add(String(m.appId));
    }
    return installed;
  } catch (e) {
    sails.log.debug("Sales channels: module lookup skipped", e);
    return null;
  }
}

export function isProviderInstalled(appId: string | null | undefined, installed: Set<string> | null): boolean | null {
  if (!appId) return false;
  if (!installed) return null;
  return installed.has(appId);
}

/** Can channels of this type exist at all: known, not "Coming soon", has a provider module. */
export function isTypeAvailable(typeDef: SalesChannelTypeDefinition | null | undefined): boolean {
  return Boolean(typeDef && !typeDef.comingSoon && typeDef.providerModule);
}

export function getAdminRoutePrefix(): string {
  const prefix = (sails as any).hooks?.adminpanel?.adminizer?.config?.routePrefix || (sails as any).config?.adminpanel?.routePrefix || "/admin";
  return String(prefix).replace(/\/$/, "");
}

/** Marketplace catalog of the module manager: exact module (`appId`) or a tag filter. */
export function marketplaceUrl(query: { appId?: string | null; tags?: string | null }): string {
  const base = `${getAdminRoutePrefix()}/modules/catalog`;
  if (query.appId) return `${base}?appId=${encodeURIComponent(query.appId)}`;
  if (query.tags) return `${base}?tags=${encodeURIComponent(query.tags)}`;
  return base;
}

/** Tag a provider module declares in its package.json `keywords` for a channel type. */
export function channelTypeTag(type: string): string {
  return `sales-channel:${type}`;
}

/** Provider settings page for one channel: `settingsUrl?channel=<id>`. */
export function channelSettingsUrl(typeDef: SalesChannelTypeDefinition | null | undefined, channel: { id?: string } | null): string | null {
  const base = typeDef?.settingsUrl;
  if (!base) return null;
  if (!channel?.id) return base;
  return `${base}${base.includes("?") ? "&" : "?"}channel=${encodeURIComponent(channel.id)}`;
}

/** Strip the admin route prefix: the setup checklist expects routePrefix-relative targets. */
export function toAdminRelative(url: string): string {
  const prefix = getAdminRoutePrefix();
  return prefix && url.startsWith(`${prefix}/`) ? url.slice(prefix.length) : url;
}

export interface ChannelProviderView {
  managedBy: "provider" | "operator";
  providerInstalled: boolean | null;
  providerAlive: boolean;
  /** Type is unknown (legacy), "Coming soon" or has no provider (custom): nothing to install. */
  typeComingSoon: boolean;
  /** Where to install the provider; only when it is not installed. */
  marketplaceAppId: string | null;
  /** Provider settings for this channel; only when the provider is alive. */
  settingsUrl: string | null;
  status: string;
  statusMessage: string | null;
  active: boolean;
  /** Provider channels can only be disabled while their provider is installed. */
  canDelete: boolean;
}

/**
 * Provider-related view of a channel, the same for the admin API and MCP. `computed` is a
 * fresh readiness from SalesChannel.channelStatus/refreshStatus; without it the stored
 * status is used (and "no live provider" still wins).
 */
export function describeChannelProvider(
  channel: SalesChannelRecord | any,
  installed: Set<string> | null,
  computed?: SalesChannelStatusResult | null
): ChannelProviderView {
  const typeDef = SalesChannelRegistry.getType(channel?.type);
  const providerModule = channel?.providerModule || typeDef?.providerModule || null;
  const providerInstalled = isProviderInstalled(providerModule, installed);
  const providerAlive = Boolean(SalesChannel.getAdapter(channel?.type));
  const managedBy = channel?.managedBy === "provider" ? "provider" : "operator";

  let status: string = computed?.status || channel?.status || "draft";
  let statusMessage: string | null = computed?.message || null;
  if (!providerAlive) {
    status = "error";
    statusMessage = providerInstalled === false || !providerModule ? "Not working: provider is not installed" : "Provider did not load";
  }

  return {
    managedBy,
    providerInstalled,
    providerAlive,
    typeComingSoon: !isTypeAvailable(typeDef),
    marketplaceAppId: providerInstalled === false && isTypeAvailable(typeDef) ? typeDef?.marketplaceAppId || providerModule : null,
    settingsUrl: providerAlive ? channelSettingsUrl(typeDef, channel) : null,
    status,
    statusMessage,
    active: Boolean(channel?.enabled === true && status === "ready" && providerAlive),
    canDelete: managedBy !== "provider" || providerInstalled === false || (providerInstalled === null && !providerAlive),
  };
}

/** Fresh readiness for a list of channels: one refreshStatus per type present. */
export async function refreshStatuses(channels: SalesChannelRecord[]): Promise<Record<string, SalesChannelStatusResult>> {
  const out: Record<string, SalesChannelStatusResult> = {};
  const types = Array.from(new Set(channels.map((channel) => channel.type)));
  for (const type of types) {
    try {
      Object.assign(out, await SalesChannel.refreshStatus(type));
    } catch (e) {
      sails.log.warn(`Sales channels: status refresh failed for type ${type}`, e);
    }
  }
  return out;
}

/** Creating a channel by hand (admin API, "Custom channel" screen, MCP). */
export async function checkCanCreate(type: string): Promise<SalesChannelRefusal | null> {
  const typeDef = SalesChannelRegistry.getType(type);
  if (!isTypeAvailable(typeDef)) {
    return { status: 409, error: "Channel type is not available yet" };
  }
  if (!SalesChannel.getAdapter(type)) {
    return {
      status: 409,
      error: "Install the provider first",
      extra: { marketplaceAppId: typeDef.marketplaceAppId || typeDef.providerModule },
    };
  }
  if (typeDef.supportsMultipleInstances === false && (await SalesChannel.count({ type })) > 0) {
    return { status: 409, error: "This channel type allows only one channel" };
  }
  return null;
}

/**
 * A platform belongs to at most one channel. Only platforms ADDED by this save are checked:
 * duplicates that existed before the rule are left alone.
 */
export async function checkPlatforms(platforms: string[], existing: SalesChannelRecord | null): Promise<SalesChannelRefusal | null> {
  const before = new Set(stringList(existing?.platforms));
  const added = stringList(platforms).filter((platform) => !before.has(platform));
  const owner = await SalesChannel.findPlatformOwner(added, existing?.id || null);
  if (!owner) return null;
  return {
    status: 409,
    error: "Platform {platform} is already used by channel {key}",
    params: { platform: owner.platform, key: owner.channel.key },
  };
}

/**
 * Switching a channel on: only with a live provider that answers `ready` right now (the
 * stored status is not trusted). Returns the fresh readiness alongside the refusal.
 */
export async function checkCanEnable(
  channel: SalesChannelRecord,
  installed: Set<string> | null
): Promise<{ refusal: SalesChannelRefusal | null; computed: SalesChannelStatusResult }> {
  const typeDef = SalesChannelRegistry.getType(channel.type);
  const computed = await SalesChannel.channelStatus(channel);
  if (!SalesChannel.getAdapter(channel.type)) {
    const providerModule = channel.providerModule || typeDef?.providerModule || null;
    const notInstalled = isProviderInstalled(providerModule, installed) !== true || !isTypeAvailable(typeDef);
    return {
      computed,
      refusal: {
        status: 409,
        error: notInstalled ? "Install the provider first" : "Provider did not load",
        extra: { marketplaceAppId: notInstalled && isTypeAvailable(typeDef) ? typeDef?.marketplaceAppId || providerModule : null },
      },
    };
  }
  if (computed.status !== "ready") {
    return {
      computed,
      refusal: {
        status: 409,
        error: "Finish setup first",
        extra: { settingsUrl: channelSettingsUrl(typeDef, channel), message: computed.message || null },
      },
    };
  }
  return { refusal: null, computed };
}

/** Deleting: provider channels only once their provider module is gone. */
export function checkCanDelete(channel: SalesChannelRecord, installed: Set<string> | null): SalesChannelRefusal | null {
  if (describeChannelProvider(channel, installed).canDelete) return null;
  return { status: 409, error: "This channel belongs to an installed provider module: disable it instead" };
}

/**
 * Setup checklist item "has_sales_channel": done when at least one channel is ACTIVE. While it
 * is not, the target points where the next step happens: the marketplace when there is
 * nothing to work with, the provider's settings when a channel still needs setup, the
 * channels screen when a ready channel is just switched off. The target is resolved right
 * after check() with the same ctx (SetupChecklistService.evaluate), hence the WeakMap.
 */
export function salesChannelCheckup(): Pick<CheckupDefinition, "check" | "target"> {
  const targets = new WeakMap<object, CheckupTarget>();
  const managerTarget: CheckupTarget = { url: "/sales-channels-manager" };

  return {
    target: (ctx) => targets.get(ctx) || managerTarget,
    check: async (ctx) => {
      const channels = await SalesChannel.find({});
      const catalogTarget: CheckupTarget = { url: toAdminRelative(marketplaceUrl({ tags: "sales-channel" })), labelKey: "Install from marketplace" };
      if (channels.length === 0) {
        targets.set(ctx, catalogTarget);
        return { status: "todo", detailKey: "No sales channels yet" };
      }

      const [installed, statuses] = await Promise.all([getInstalledProviderAppIds(), refreshStatuses(channels)]);
      const views = channels.map((channel) => ({ channel, view: describeChannelProvider(channel, installed, statuses[channel.id]) }));

      const active = views.filter(({ view }) => view.active);
      if (active.length) {
        return { status: "done", detailKey: "{count} of {total} working", detailParams: { count: active.length, total: channels.length } };
      }

      const enabledWithoutProvider = views.filter(({ channel, view }) => channel.enabled === true && view.providerInstalled === false);
      if (enabledWithoutProvider.length) {
        const modules = Array.from(new Set(enabledWithoutProvider.map(({ channel }) => channel.providerModule || channel.type)));
        targets.set(ctx, managerTarget);
        return {
          status: "todo",
          detailKey: "{count} enabled, but the provider module is not installed: {modules}",
          detailParams: { count: enabledWithoutProvider.length, modules: modules.join(", ") },
        };
      }

      const needsSetup = views.find(({ view }) => view.providerAlive && view.status !== "ready" && view.settingsUrl);
      if (needsSetup) {
        targets.set(ctx, { url: toAdminRelative(needsSetup.view.settingsUrl), labelKey: "Set up" });
        return { status: "todo", detailKey: "Finish setup of {title}", detailParams: { title: needsSetup.channel.title || needsSetup.channel.key } };
      }

      const readyOff = views.filter(({ view }) => view.providerAlive && view.status === "ready");
      if (readyOff.length) {
        targets.set(ctx, managerTarget);
        return { status: "todo", detailKey: "{count} ready, none enabled", detailParams: { count: readyOff.length } };
      }

      targets.set(ctx, catalogTarget);
      return { status: "todo", detailKey: "No working sales channels: install a provider module" };
    },
  };
}
