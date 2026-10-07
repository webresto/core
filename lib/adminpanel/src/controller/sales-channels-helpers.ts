// Shared helpers for the Sales Channels admin module controllers.
// Mirrors the marketing/notifications controllers: access guard + JSON parsing + record
// mapping. The `${routePrefix}/core` middleware already sets no-store on every /core route.

import slugifyLib from "slugify";
import { SalesChannelRegistry } from "../../../../libs/SalesChannelRegistry";
import { describeChannelProvider, refusalText, SalesChannelRefusal } from "../../../../libs/SalesChannelProviders";
import type { SalesChannelStatusResult } from "../../../../adapters/sales-channel/SalesChannelAdapter";
import {
  getModulePermissions,
  hasAnyPermission,
  requireModulePermission,
  SALES_CHANNELS_ACCESS,
} from "./access-rights";

/**
 * Auth + permission guard. Returns false (and writes the response) when access is denied.
 */
export function hasAccess(req: any, res: any): boolean {
  return requireModulePermission(req, res, SALES_CHANNELS_ACCESS, "view");
}

export function hasManageAccess(req: any, res: any): boolean {
  return requireModulePermission(req, res, SALES_CHANNELS_ACCESS, "manage");
}

export function getSalesChannelPermissions(req: any) {
  return {
    ...getModulePermissions(req, SALES_CHANNELS_ACCESS),
    // Same right the module manager checks before installing (app-manager upgrade action).
    canInstallProviders: hasAnyPermission(req, req.user, ["modules-process-upgrade"]),
  };
}

/** Answer a refused rule (409 & co.) with a translated `error` plus its extra fields. */
export function sendRefusal(req: any, res: any, refusal: SalesChannelRefusal) {
  const t = (key: string) => (req?.i18n?.__ ? req.i18n.__(key) : key);
  const extra: Record<string, unknown> = { ...(refusal.extra || {}) };
  if (typeof extra.message === "string") extra.message = t(extra.message);
  return res.status(refusal.status).json({ error: refusalText(refusal, t), ...extra });
}

export function toNumber(value: any): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function stringArray(value: any): string[] {
  if (!Array.isArray(value)) {
    if (typeof value === "string" && value.trim()) {
      try { const parsed = JSON.parse(value); if (Array.isArray(parsed)) value = parsed; } catch { return []; }
    } else {
      return [];
    }
  }
  return (value as any[])
    .filter((x: any) => typeof x === "string" && x.trim())
    .map((x: string) => x.trim());
}

export function parseJsonObject(value: any): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value === "string" && value.trim()) {
    try { const parsed = JSON.parse(value); if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed; } catch { /* ignore */ }
  }
  return {};
}

/**
 * Slugify a free-text title into a stable channel key.
 *
 * `slugify` transliterates Cyrillic and other charmapped alphabets, so a title like "Сайт"
 * becomes "sajt" instead of an empty key. The same helper backs the Dish/Group slugs, and the
 * admin page runs it on the client, so the key the operator sees is the key that gets stored.
 * Scripts outside the charmap (CJK and the like) still slugify to "", and the caller decides
 * what to do about that.
 */
export function slugify(value: string): string {
  return slugifyLib(String(value || ""), { lower: true, strict: true, locale: "en" })
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

/**
 * Map a SalesChannel record into the shape used by the admin frontend. `installed` is the
 * set from getInstalledProviderAppIds() (fetched once per request), `computed` a fresh
 * readiness from the provider; see libs/SalesChannelProviders.ts for the provider fields.
 */
export function mapChannel(
  channel: any,
  options: { canManage?: boolean; installed?: Set<string> | null; computed?: SalesChannelStatusResult | null; req?: any } = {}
): any {
  const typeDef = SalesChannelRegistry.getType(channel?.type);
  const canManage = options.canManage === true;
  const provider = describeChannelProvider(channel, options.installed ?? null, options.computed);
  const t = (key: string) => (options.req?.i18n?.__ ? options.req.i18n.__(key) : key);
  return {
    id: channel?.id,
    key: channel?.key || "",
    title: channel?.title || channel?.key || "",
    type: channel?.type || "custom",
    typeTitle: typeDef?.title || channel?.type || "custom",
    category: typeDef?.category || "custom",
    capabilities: typeDef?.capabilities || [],
    icon: typeDef?.icon || "tune",
    settingsUrl: canManage ? provider.settingsUrl : null,
    providerModule: canManage ? (channel?.providerModule || null) : null,
    managedBy: provider.managedBy,
    providerInstalled: provider.providerInstalled,
    providerAlive: provider.providerAlive,
    typeComingSoon: provider.typeComingSoon,
    marketplaceAppId: provider.marketplaceAppId,
    canDelete: provider.canDelete,
    active: provider.active,
    enabled: channel?.enabled === true,
    status: provider.status,
    statusMessage: provider.statusMessage ? t(provider.statusMessage) : null,
    countries: stringArray(channel?.countries),
    concepts: stringArray(channel?.concepts),
    platforms: stringArray(channel?.platforms),
    defaultConcept: channel?.defaultConcept || null,
    allowConceptSwitch: channel?.allowConceptSwitch !== false,
    url: channel?.url || null,
    settings: canManage ? parseJsonObject(channel?.settings) : {},
    publicConfig: parseJsonObject(channel?.publicConfig),
    sortOrder: toNumber(channel?.sortOrder),
    createdAt: channel?.createdAt ?? null,
    updatedAt: channel?.updatedAt ?? null,
  };
}
