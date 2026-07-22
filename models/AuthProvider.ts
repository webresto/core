import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";
import { v4 as uuid } from "uuid";
import { OptionalAll, RequiredField } from "../interfaces/toolsTS";
import type AuthProviderAdapter from "../adapters/auth/AuthProviderAdapter";
import type { AuthFlowKind } from "../adapters/auth/AuthProviderAdapter";

/** Live adapter instances that self-registered on boot (slug → adapter). */
let aliveAuthProviders = {} as { [slug: string]: AuthProviderAdapter };

/** Public projection of an AuthProvider — the ONLY shape allowed to reach the frontend. */
export interface AuthProviderPublic {
  adapter: string;
  title: string;
  kind: AuthFlowKind;
  iconUrl?: string;
  buttonColor?: string;
  buttonTextColor?: string;
  sortOrder?: number;
}

let attributes = {
  /** ID of the auth provider config-instance */
  id: {
    type: "string",
  } as unknown as string,

  /** Slug of the provider *type* (telegram, max, vk …). One row = one button on the login page. */
  adapter: {
    type: "string",
    unique: true,
    required: true,
  } as unknown as string,

  /** Button label */
  title: "string",

  /** AuthFlowKind, denormalized from the adapter so the UI can render without a live adapter */
  kind: "string" as unknown as AuthFlowKind,

  /** Master on/off switch (default from DEFAULT_ENABLE_AUTH_PROVIDERS) */
  enable: {
    type: "boolean",
  } as unknown as boolean,

  sortOrder: "number" as unknown as number,

  /** Branding for the login page */
  iconUrl: "string",
  buttonColor: "string",
  buttonTextColor: "string",

  /**
   * Secrets / keys. NEVER exposed through GraphQL (see AuthProviderPublic / getAvailable).
   * { clientId, clientSecret, botToken, scope, redirectUri, ... }
   */
  config: "json" as unknown as {
    [key: string]: string | boolean | number;
  } | string,

  /** true => after a social login force phone confirmation by OTP */
  requirePhoneVerification: {
    type: "boolean",
  } as unknown as boolean,

  /** true => if the provider returned a verified phone (Telegram/MAX contact), trust it without OTP */
  trustProviderPhone: {
    type: "boolean",
  } as unknown as boolean,

  /** Targeting: which sales channels this provider is shown in (slugs / ids) */
  salesChannels: "json" as unknown as string[],

  /** Targeting: countries this provider is recommended/limited to (['RU','KZ']) */
  countries: "json" as unknown as string[],

  /** appId of the module that supplies this provider (like SalesChannel.providerModule) */
  providerModule: {
    type: "string",
    allowNull: true,
  } as unknown as string,

  /** ready | needs_setup | error — updated by alive()/healthcheck() */
  healthStatus: "string",

  customData: "json" as unknown as {
    [key: string]: string | boolean | number;
  } | string,
};

type attributes = typeof attributes;
/**
 * @deprecated use `AuthProviderRecord` instead
 */
interface AuthProvider extends RequiredField<OptionalAll<attributes>, "adapter">, ORM {}
export interface AuthProviderRecord extends RequiredField<OptionalAll<attributes>, "adapter">, ORM {}

const PUBLIC_FIELDS: (keyof AuthProviderPublic)[] = ["adapter", "title", "kind", "iconUrl", "buttonColor", "buttonTextColor", "sortOrder"];

function toPublic(row: AuthProviderRecord): AuthProviderPublic {
  const out: any = {};
  for (const f of PUBLIC_FIELDS) out[f] = (row as any)[f];
  return out as AuthProviderPublic;
}

let Model = {
  beforeCreate: function (record: AuthProviderRecord, cb: (err?: string) => void) {
    if (!record.id) {
      record.id = uuid();
    }
    cb();
  },

  /**
   * Self-registration on boot (analogue of PaymentMethod.alive). findOrCreate the config row,
   * cache the live adapter instance, refresh denormalized fields + healthStatus.
   */
  async alive(authAdapter: AuthProviderAdapter): Promise<void> {
    const init = authAdapter.InitAuthAdapter;
    let defaultEnable = (await Settings.get("DEFAULT_ENABLE_AUTH_PROVIDERS")) ?? false;

    const known = await AuthProvider.findOrCreate(
      { adapter: init.adapter },
      {
        adapter: init.adapter,
        title: init.title,
        kind: init.kind,
        iconUrl: init.iconUrl,
        buttonColor: init.buttonColor,
        buttonTextColor: init.buttonTextColor,
        sortOrder: init.sortOrder ?? 0,
        enable: defaultEnable as boolean,
        // Seed the phone-verification policy from the adapter's declared defaults on first create;
        // the operator can override these later in the admin without them being reset.
        trustProviderPhone: init.trustProviderPhone ?? false,
        requirePhoneVerification: init.requirePhoneVerification ?? false,
        providerModule: (init.config?.providerModule as string) ?? null,
        healthStatus: "needs_setup",
      }
    );

    aliveAuthProviders[init.adapter] = authAdapter;
    // Also register on the global Adapter class so getAuthAdapter() resolves boot-registered
    // adapters. Uses the runtime global (set in hook/initialize) to avoid a circular import.
    try {
      (global as any).Adapter?.registerAuthAdapter?.(authAdapter);
    } catch (e) {
      sails.log.silly("AuthProvider > alive: Adapter.registerAuthAdapter unavailable", e);
    }

    // Refresh denormalized UI fields (kind/title/icon can change between versions) and health.
    let health: { ok: boolean; message?: string } = { ok: true };
    try {
      health = await authAdapter.healthcheck();
    } catch (e) {
      health = { ok: false, message: `${e}` };
    }

    await AuthProvider.updateOne({ adapter: init.adapter }, {
      title: known.title || init.title,
      kind: init.kind,
      // Refresh which module supplies this provider, so moving a provider between modules
      // (e.g. telegram: ru_auth_providers → telegram_auth_provider) corrects the stored appId.
      providerModule: (init.config?.providerModule as string) ?? known.providerModule ?? null,
      healthStatus: health.ok ? "ready" : "needs_setup",
    });

    sails.log.silly("AuthProvider > alive", init.adapter, health);
    return;
  },

  /** Returns the live adapter instance for a slug (undefined if not alive). */
  getAdapter(slug: string): AuthProviderAdapter | undefined {
    return aliveAuthProviders[slug];
  },

  /** Slugs of all currently-alive adapters. */
  getAliveSlugs(): string[] {
    return Object.keys(aliveAuthProviders);
  },

  /**
   * Public list for the login page: enable && alive, sorted, filtered by channel/country.
   * Returns ONLY public fields — secrets are stripped here.
   */
  async getAvailable(ctx?: { salesChannel?: string; country?: string }): Promise<AuthProviderPublic[]> {
    const rows = await AuthProvider.find({
      where: {
        adapter: Object.keys(aliveAuthProviders),
        enable: true,
      },
      sort: "sortOrder ASC",
    });

    const filtered = rows.filter((row) => {
      if (ctx?.salesChannel && Array.isArray(row.salesChannels) && row.salesChannels.length) {
        if (!row.salesChannels.includes(ctx.salesChannel)) return false;
      }
      if (ctx?.country && Array.isArray(row.countries) && row.countries.length) {
        if (!row.countries.includes(ctx.country.toUpperCase())) return false;
      }
      return true;
    });

    return filtered.map(toPublic);
  },

  /** Returns the full config row by slug (server-side only — includes secrets). */
  async getBySlug(slug: string): Promise<AuthProviderRecord | undefined> {
    return await AuthProvider.findOne({ adapter: slug });
  },

  /** Re-run the adapter healthcheck and persist the status (used by the admin "Check" button). */
  async runHealthcheck(slug: string): Promise<{ ok: boolean; message?: string }> {
    const adapter = aliveAuthProviders[slug];
    if (!adapter) return { ok: false, message: "adapter is not alive" };
    let health: { ok: boolean; message?: string };
    try {
      health = await adapter.healthcheck();
    } catch (e) {
      health = { ok: false, message: `${e}` };
    }
    await AuthProvider.updateOne({ adapter: slug }, { healthStatus: health.ok ? "ready" : "error" });
    return health;
  },
};

module.exports = {
  primaryKey: "id",
  attributes: attributes,
  ...Model,
};

declare global {
  const AuthProvider: typeof Model & ORMModel<AuthProviderRecord, "adapter">;
}
