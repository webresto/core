import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";
import { OptionalAll, RequiredField } from "../interfaces/toolsTS";
import type AuthProviderAdapter from "../adapters/auth/AuthProviderAdapter";
import type { AuthFlowKind } from "../adapters/auth/AuthProviderAdapter";
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
declare let attributes: {
    /** ID of the auth provider config-instance */
    id: string;
    /** Slug of the provider *type* (telegram, zalo, fb …). One row = one button on the login page. */
    adapter: string;
    /** Button label */
    title: string;
    /** AuthFlowKind, denormalized from the adapter so the UI can render without a live adapter */
    kind: AuthFlowKind;
    /** Master on/off switch (default from DEFAULT_ENABLE_AUTH_PROVIDERS) */
    enable: boolean;
    sortOrder: number;
    /** Branding for the login page */
    iconUrl: string;
    buttonColor: string;
    buttonTextColor: string;
    /**
     * Secrets / keys. NEVER exposed through GraphQL (see AuthProviderPublic / getAvailable).
     * { clientId, clientSecret, botToken, scope, redirectUri, ... }
     */
    config: {
        [key: string]: string | boolean | number;
    } | string;
    /** true => after a social login force phone confirmation by OTP */
    requirePhoneVerification: boolean;
    /** true => if the provider returned a verified phone (Telegram/MAX contact), trust it without OTP */
    trustProviderPhone: boolean;
    /** Targeting: which sales channels this provider is shown in (slugs / ids) */
    salesChannels: string[];
    /** Targeting: countries this provider is recommended/limited to (['RU','KZ']) */
    countries: string[];
    /** appId of the module that supplies this provider (like SalesChannel.providerModule) */
    providerModule: string;
    /** ready | needs_setup | error — updated by alive()/healthcheck() */
    healthStatus: string;
    customData: {
        [key: string]: string | boolean | number;
    } | string;
};
type attributes = typeof attributes;
export interface AuthProviderRecord extends RequiredField<OptionalAll<attributes>, "adapter">, ORM {
}
declare let Model: {
    beforeCreate: (record: AuthProviderRecord, cb: (err?: string) => void) => void;
    /**
     * Self-registration on boot (analogue of PaymentMethod.alive). findOrCreate the config row,
     * cache the live adapter instance, refresh denormalized fields + healthStatus.
     */
    alive(authAdapter: AuthProviderAdapter): Promise<void>;
    /** Returns the live adapter instance for a slug (undefined if not alive). */
    getAdapter(slug: string): AuthProviderAdapter | undefined;
    /** Slugs of all currently-alive adapters. */
    getAliveSlugs(): string[];
    /**
     * Public list for the login page: enable && alive, sorted, filtered by channel/country.
     * Returns ONLY public fields — secrets are stripped here.
     */
    getAvailable(ctx?: {
        salesChannel?: string;
        country?: string;
    }): Promise<AuthProviderPublic[]>;
    /** Returns the full config row by slug (server-side only — includes secrets). */
    getBySlug(slug: string): Promise<AuthProviderRecord | undefined>;
    /** Re-run the adapter healthcheck and persist the status (used by the admin "Check" button). */
    runHealthcheck(slug: string): Promise<{
        ok: boolean;
        message?: string;
    }>;
};
declare global {
    const AuthProvider: typeof Model & ORMModel<AuthProviderRecord, "adapter">;
}
export {};
