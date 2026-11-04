// Shared helpers for the Sales Channels admin module controllers.
// Mirrors the marketing/notifications controllers: access guard + JSON parsing + record
// mapping. The `${routePrefix}/core` middleware already sets no-store on every /core route.
//
// The view of a record and the rules of writing one are NOT here: they are `lib/sales-channels/`
// (`describeChannel`, `applyChannel`), shared with the MCP tools and the mobile API so that the
// page, the tools and the phone cannot drift apart on a word or on a rule.

import { refusalText, SalesChannelRefusal } from "../../../SalesChannelProviders";
import { describeChannel, jsonObject, stringArray as stringList, type ChannelView } from "../../../sales-channels/view";
import { slugifyChannelKey } from "../../../sales-channels/apply";
import type { SalesChannelStatusResult } from "../../../../adapters";
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

/** The dictionary of the admin panel for this request: the words of a refusal and of a view. */
export function translator(req: any): (key: string) => string {
  return (key: string) => (req?.i18n?.__ ? req.i18n.__(key) : key);
}

/** Answer a refused rule (409 & co.) with a translated `error` plus its extra fields. */
export function sendRefusal(req: any, res: any, refusal: SalesChannelRefusal) {
  const t = translator(req);
  const extra: Record<string, unknown> = { ...(refusal.extra || {}) };
  if (typeof extra.message === "string") extra.message = t(extra.message);
  return res.status(refusal.status).json({ error: refusalText(refusal, t), ...extra });
}

export function toNumber(value: any): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/** Strings of a list that may arrive as JSON text from a form. */
export function stringArray(value: any): string[] {
  return stringList(value);
}

export function parseJsonObject(value: any): Record<string, unknown> {
  return jsonObject(value);
}

/** The one slug of a channel key, transliterating Cyrillic — see lib/sales-channels/apply.ts. */
export const slugify = slugifyChannelKey;

/**
 * Map a SalesChannel record into the shape used by the admin frontend. `installed` is the
 * set from getInstalledProviderAppIds() (fetched once per request), `computed` a fresh
 * readiness from the provider; the fields and the words both come from
 * lib/sales-channels/view.ts, which the MCP tools and the mobile API read as well.
 */
export function mapChannel(
  channel: any,
  options: { canManage?: boolean; installed?: Set<string> | null; computed?: SalesChannelStatusResult | null; req?: any } = {}
): ChannelView {
  return describeChannel(channel, {
    canManage: options.canManage === true,
    installed: options.installed ?? null,
    computed: options.computed,
    t: translator(options.req),
  });
}
