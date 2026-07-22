import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";
import { OptionalAll, RequiredField } from "../interfaces/toolsTS";
import { NormalizedProfile } from "../adapters/auth/AuthProviderAdapter";
export type AuthStateStatus = "started" | "awaiting_phone" | "done" | "expired";
/**
 * Ephemeral state of a single login attempt. Holds the oauth state/nonce/PKCE and,
 * for social logins waiting on phone confirmation, the pending profile. TTL-cleaned.
 * `id` doubles as the oauth `state` parameter.
 */
declare let attributes: {
    /** == oauth `state` */
    id: string;
    provider: string;
    /** the UserDevice that initiated the login */
    deviceId: string;
    /** PKCE / OIDC */
    nonce: string;
    codeVerifier: string;
    redirectBack: string;
    salesChannel: string;
    country: string;
    locale: string;
    /** NormalizedProfile of a social login that still needs a confirmed phone */
    pendingProfile: NormalizedProfile;
    status: AuthStateStatus;
    /** login string used for the OTP request while awaiting phone confirmation */
    otpLogin: string;
    /** once done: the User this attempt resolved to (for authStatus polling) */
    resolvedUser: string;
    /** one-time ticket the browser exchanges for a JWT (OAuth redirect flow) */
    authTicket: string;
    /**
     * Provider-specific scratch data for this attempt, owned by the provider module — the core
     * never interprets it. Bot flows (Telegram/MAX) use it to remember the chat that started the
     * login (e.g. { telegramChatId }) so a later "share contact" message can be matched back to
     * this AuthState, since that message does not carry the `/start <stateId>` param.
     */
    customData: {
        [key: string]: string | number | boolean;
    };
    /** TTL — cleaned by cron/afterHook */
    expiresAt: number;
};
type attributes = typeof attributes;
export interface AuthStateRecord extends RequiredField<OptionalAll<attributes>, "provider" | "deviceId">, ORM {
}
declare let Model: {
    beforeCreate: (record: AuthStateRecord, cb: (err?: string) => void) => void;
    /** Fetch a non-expired state. Marks expired ones and returns undefined. */
    getActive(stateId: string): Promise<AuthStateRecord | undefined>;
    /** Delete states whose TTL has passed (called from a periodic cleanup). */
    cleanupExpired(): Promise<number>;
};
declare global {
    const AuthState: typeof Model & ORMModel<AuthStateRecord, "provider" | "deviceId">;
}
export {};
