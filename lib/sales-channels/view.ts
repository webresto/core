/**
 * The view of a sales channel: the fields a screen shows AND the words it says.
 *
 * Before this file `mapChannel` existed twice — `lib/adminpanel/src/controller/sales-channels-helpers.ts`
 * for the admin page and `hook/mcp/sales-channels.ts` for the MCP tools — while the words themselves
 * ("Working", "Not working: provider is not installed", …) were assembled a third time, in the browser
 * (`lib/adminpanel/src/sales-channels-manager.jsx`). The mobile API would have been a fourth copy, and the
 * phone has no i18n of the admin panel: a status it cannot name is a status it cannot explain.
 *
 * So the view lives here: `describeChannel()` answers both the flags (providerInstalled, providerAlive,
 * canDelete, …, from `lib/SalesChannelProviders.ts`) and the words. `t` translates the English phrases that
 * serve as the i18n keys of the admin panel (`lib/adminpanel/i18n/locales/*.json`); without it the English
 * phrase itself comes back, which is what the MCP tools want.
 */

import { SalesChannelRegistry } from "../SalesChannelRegistry";
import { describeChannelProvider, ChannelProviderView } from "../SalesChannelProviders";
import type { SalesChannelRecord } from "../../models/SalesChannel";
import type { SalesChannelStatusResult } from "../../adapters";

/** Translates an English phrase of the admin locales; identity when the caller has no dictionary. */
export type Translate = (key: string) => string;

const identity: Translate = (key) => key;

/** The badge of a channel — `statusLabel` of the admin page, the same five words. */
const STATUS_WORDS: Record<string, string> = {
  ready: "Working",
  needs_setup: "Needs setup",
  draft: "Draft",
  disabled: "Disabled",
  error: "Error",
};

export function channelStatusText(status: string | null | undefined, t: Translate = identity): string {
  const word = STATUS_WORDS[String(status || "")];
  return word ? t(word) : String(status || "—");
}

/**
 * Why the channel works or does not — `ProviderMissingNotice` of the admin page plus the state line of
 * a type card: "Channel type is coming soon", "Not working: provider is not installed (appId)",
 * "Provider did not load: restart the server to finish installing it", "admin-frontend · Provider installed".
 */
export function channelProviderText(
  view: Pick<ChannelProviderView, "providerAlive" | "providerInstalled" | "typeComingSoon" | "marketplaceAppId">,
  providerModule: string | null,
  t: Translate = identity,
): string {
  if (!view.providerAlive) {
    if (view.typeComingSoon) return t("Channel type is coming soon");
    // `providerInstalled` is null when there is no Module model at all: that is "unknown", and the
    // admin page treats it as installed — the provider simply did not register itself in this process.
    if (view.providerInstalled === false || !providerModule) {
      const appId = view.marketplaceAppId || providerModule;
      return `${t("Not working: provider is not installed")}${appId ? ` (${appId})` : ""}`;
    }
    return t("Provider did not load: restart the server to finish installing it");
  }
  return providerModule ? `${providerModule} · ${t("Provider installed")}` : t("Provider installed");
}

/** "Все концепции" when the list is empty: an unbound channel writes every concept. */
export function conceptsText(concepts: string[], t: Translate = identity): string {
  return concepts.length ? concepts.join(" · ") : t("All concepts");
}

export interface ChannelViewOptions {
  /** Without it `settingsUrl`, `providerModule` and `settings` are not in the view at all. */
  canManage?: boolean;
  /** `getInstalledProviderAppIds()`, read once per request; null = no Module model. */
  installed?: Set<string> | null;
  /** Fresh readiness from the provider; without it the stored `status` is used. */
  computed?: SalesChannelStatusResult | null;
  t?: Translate;
}

export interface ChannelView {
  id: string;
  key: string;
  title: string;
  /** "web-main · Website" — the second line of the card, as on the page. */
  subtitle: string;
  type: string;
  typeTitle: string;
  category: string;
  capabilities: string[];
  icon: string;
  /** Only with `canManage`: the page of the provider where this channel is set up. */
  settingsUrl: string | null;
  providerModule: string | null;
  managedBy: "provider" | "operator";
  providerInstalled: boolean | null;
  providerAlive: boolean;
  typeComingSoon: boolean;
  marketplaceAppId: string | null;
  canDelete: boolean;
  active: boolean;
  enabled: boolean;
  status: string;
  statusMessage: string | null;
  /** The words: the badge, and why the channel does or does not work. */
  statusText: string;
  providerText: string;
  countries: string[];
  concepts: string[];
  platforms: string[];
  countriesText: string;
  conceptsText: string;
  platformsText: string;
  defaultConcept: string | null;
  allowConceptSwitch: boolean;
  url: string | null;
  settings: Record<string, unknown>;
  publicConfig: Record<string, unknown>;
  sortOrder: number;
  createdAt: unknown;
  updatedAt: unknown;
}

export function stringArray(value: unknown): string[] {
  if (!Array.isArray(value)) {
    if (typeof value === "string" && value.trim()) {
      try {
        const parsed = JSON.parse(value);
        if (Array.isArray(parsed)) value = parsed;
        else return [];
      } catch {
        return [];
      }
    } else {
      return [];
    }
  }
  return (value as unknown[]).filter((x): x is string => typeof x === "string" && Boolean(x.trim())).map((x) => x.trim());
}

export function jsonObject(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>;
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
    } catch {
      /* not JSON: an empty object, as before */
    }
  }
  return {};
}

function toNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

/**
 * One channel as the admin page, the MCP tools and the mobile app see it. `secretsRef` is never part of
 * it — not for the operator, not for a diagnostic tool, not for the phone.
 */
export function describeChannel(channel: SalesChannelRecord | any, options: ChannelViewOptions = {}): ChannelView {
  const t = options.t || identity;
  const canManage = options.canManage === true;
  const typeDef = SalesChannelRegistry.getType(channel?.type);
  const provider = describeChannelProvider(channel, options.installed ?? null, options.computed);
  const providerModule = channel?.providerModule || typeDef?.providerModule || null;

  const countries = stringArray(channel?.countries);
  const concepts = stringArray(channel?.concepts);
  const platforms = stringArray(channel?.platforms);
  const typeTitle = typeDef?.title || channel?.type || "custom";
  const key = channel?.key || "";

  return {
    id: channel?.id,
    key,
    title: channel?.title || key,
    subtitle: [key, typeTitle].filter(Boolean).join(" · "),
    type: channel?.type || "custom",
    typeTitle,
    category: typeDef?.category || "custom",
    capabilities: typeDef?.capabilities || [],
    icon: typeDef?.icon || "tune",
    settingsUrl: canManage ? provider.settingsUrl : null,
    providerModule: canManage ? channel?.providerModule || null : null,
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
    statusText: channelStatusText(provider.status, t),
    providerText: channelProviderText(provider, providerModule, t),
    countries,
    concepts,
    platforms,
    countriesText: countries.join(" · "),
    conceptsText: conceptsText(concepts, t),
    platformsText: platforms.join(" · "),
    defaultConcept: channel?.defaultConcept || null,
    allowConceptSwitch: channel?.allowConceptSwitch !== false,
    url: channel?.url || null,
    settings: canManage ? jsonObject(channel?.settings) : {},
    publicConfig: jsonObject(channel?.publicConfig),
    sortOrder: toNumber(channel?.sortOrder),
    createdAt: channel?.createdAt ?? null,
    updatedAt: channel?.updatedAt ?? null,
  };
}
