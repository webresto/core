// Shared helpers for the Sales Channels admin module controllers.
// Mirrors the marketing/notifications controllers: access guard + JSON parsing + record
// mapping. The `${routePrefix}/core` middleware already sets no-store on every /core route.

import { SalesChannelRegistry } from "../../../../libs/SalesChannelRegistry";

export const SALES_CHANNELS_TOKEN = "sales-channels-manager";

/**
 * Auth + permission guard. Returns false (and writes the response) when access is denied.
 */
export function hasAccess(req: any, res: any, token: string = SALES_CHANNELS_TOKEN): boolean {
  const { config } = req.adminizer || {};
  if (config?.auth?.enable && !req.user) {
    res.redirect(`${config.routePrefix}/model/userap/login`);
    return false;
  }
  if (req.adminizer?.accessRightsHelper && !req.adminizer.accessRightsHelper.hasPermission(token, req.user)) {
    res.sendStatus(403);
    return false;
  }
  return true;
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

/** Slugify a free-text title into a stable channel key. */
export function slugify(value: string): string {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

/** Map a SalesChannel record into the shape used by the admin frontend. */
export function mapChannel(channel: any): any {
  const typeDef = SalesChannelRegistry.getType(channel?.type);
  return {
    id: channel?.id,
    key: channel?.key || "",
    title: channel?.title || channel?.key || "",
    type: channel?.type || "custom",
    typeTitle: typeDef?.title || channel?.type || "custom",
    category: typeDef?.category || "custom",
    capabilities: typeDef?.capabilities || [],
    icon: typeDef?.icon || "tune",
    providerModule: channel?.providerModule || null,
    enabled: channel?.enabled === true,
    status: channel?.status || "draft",
    countries: stringArray(channel?.countries),
    concepts: stringArray(channel?.concepts),
    defaultConcept: channel?.defaultConcept || null,
    allowConceptSwitch: channel?.allowConceptSwitch !== false,
    url: channel?.url || null,
    settings: parseJsonObject(channel?.settings),
    publicConfig: parseJsonObject(channel?.publicConfig),
    sortOrder: toNumber(channel?.sortOrder),
    createdAt: channel?.createdAt ?? null,
    updatedAt: channel?.updatedAt ?? null,
  };
}
