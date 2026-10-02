import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";
import { OptionalAll, RequiredField } from "../interfaces/toolsTS";
import type AuthAdapter from "../adapters/auth/AuthAdapter";
import type { AuthFlowKind, PhoneProofMode, SecretOrigin, Offer } from "../adapters/auth/AuthAdapter";
export type AuthMethodKind = "identity" | "phone_proof";
export type AuthMethodHealth = "ready" | "needs_setup" | "error" | "conflict";
/** Public projection of an AuthMethod row — the ONLY shape allowed to reach the frontend. `config` never leaves this file. */
export interface AuthMethodPublic {
    adapter: string;
    offer: string;
    kind: AuthMethodKind;
    flow?: AuthFlowKind;
    mode?: PhoneProofMode;
    canVerifyPhone: boolean;
    title: string;
    hint?: string;
    iconUrl?: string;
    buttonColor?: string;
    buttonTextColor?: string;
    sortOrder: number;
    cost: number;
    healthStatus: AuthMethodHealth;
}
declare let attributes: {
    id: string;
    /** slug of the module that owns the capability: telegram, max, smsc, zvonok, core, … */
    adapter: string;
    /** capability this row declares: identity | sms | flashcall | callback | voice | … */
    offer: string;
    kind: AuthMethodKind;
    /** only kind=identity; null on a phone_proof row */
    flow: AuthFlowKind;
    /** only kind=phone_proof; null on an identity row */
    mode: PhoneProofMode;
    /** only kind=phone_proof: who invented the secret */
    secretOrigin: SecretOrigin;
    /** only kind=phone_proof, mode=enter_code: how many digits the field needs (flashcall may be 4, SMS 6) */
    codeLength: number;
    /** only kind=identity: does the provider itself guarantee the phone (bot contact, …) */
    canVerifyPhone: boolean;
    /** appId of the module that supplies this row (like SalesChannel.providerModule) */
    providerModule: string;
    /** ready | needs_setup | error | conflict — updated by alive()/healthcheck() */
    healthStatus: AuthMethodHealth;
    enable: boolean;
    sortOrder: number;
    titleKey: string;
    hintKey: string;
    iconUrl: string;
    buttonColor: string;
    buttonTextColor: string;
    /** which purposes this row is allowed for: login | link | verify:phone | verify:delete_account | … */
    purposes: string[];
    countries: string[];
    salesChannels: string[];
    ttlSec: number;
    resendAfterSec: number;
    cost: number;
    /** only kind=identity: send a phone-verification SMS after this provider's login anyway */
    requirePhoneVerification: boolean;
    /** operator override of AUTH_MAX_IDENTITIES_PER_ADAPTER for this one adapter (null = inherit) */
    maxPerUser: number | null;
    /** secrets/keys — NEVER exposed through GraphQL */
    config: {
        [key: string]: string | boolean | number;
    } | string;
    customData: {
        [key: string]: string | boolean | number;
    } | string;
};
type attributes = typeof attributes;
export interface AuthMethodRecord extends RequiredField<OptionalAll<attributes>, "adapter" | "offer">, ORM {
}
declare function toPublic(row: AuthMethodRecord): AuthMethodPublic;
declare let Model: {
    beforeCreate(record: AuthMethodRecord, cb: (err?: string) => void): void;
    /**
     * Self-registration on boot (analogue of PaymentMethod.alive / the old AuthProvider.alive).
     * One adapter instance may declare several offers (e.g. an SMS gateway offering both
     * `sms` and `flashcall`); each offer gets its own row and its own conflict check.
     *
     * Conflict handling: a second module trying to occupy an already-alive (adapter, offer)
     * pair does NOT win by load order — the first registrant keeps the live instance, the row
     * is flagged `healthStatus: conflict`, and the operator sees it in the admin (design2 §4.1,
     * closes Д1 by construction).
     *
     * Cluster-safe (review2 §2.2). N PM2 workers run this at the same moment against one table:
     *   - the live instance is remembered BEFORE anything is written, so a worker whose write
     *     loses a race (or whose database call fails outright) still serves the method — the
     *     row is shared, the instance is per process, and `getForPurpose` needs both;
     *   - the row is created by whoever gets there first; a loser of that race reads the row
     *     the winner made instead of rejecting on the unique index and taking the method with it;
     *   - `healthStatus` is written by the primary worker only. It is one column for the whole
     *     installation, and N workers each writing their own transient answer to "can I reach
     *     the provider" would let a single blip on one of them switch the method off for all.
     */
    alive(adapter: AuthAdapter): Promise<void>;
    /**
     * The registry row for one (adapter, offer), created on first sight.
     *
     * Not `findOrCreate`: that is a read followed by a write, and two workers booting together
     * both read "nothing there" and both write. The unique index then rejects one of them — which
     * is right for the table and wrong for the worker, whose registration used to reject with it.
     * Here a failed create is answered by reading the row again: if somebody else made it in the
     * meantime, that row is the one we wanted; if nobody did, the error was real and is rethrown.
     */
    ensureRow(adapter: AuthAdapter, offer: Offer, defaultEnable: boolean): Promise<AuthMethodRecord>;
    /** Live adapter instance serving a given (adapter, offer) pair, if any. */
    getAdapter(adapter: string, offer: string): AuthAdapter | undefined;
    /** Live adapter instance for a slug, regardless of which offer resolved it (first match). */
    getAdapterBySlug(adapter: string): AuthAdapter | undefined;
    /**
     * Rows usable for `purpose`, filtered by enable/health/country/salesChannel, sorted by
     * sortOrder. `kind` narrows to identity buttons or phone_proof verification methods.
     * Identity rows with `canVerifyPhone` are ALSO phone_proof-eligible (design2 §4.1) — pass
     * `includeVerifyingIdentities: true` when building the verification-method list.
     */
    getForPurpose(purpose: string, ctx?: {
        kind?: AuthMethodKind;
        salesChannel?: string;
        country?: string;
        includeVerifyingIdentities?: boolean;
    }): Promise<AuthMethodRecord[]>;
    getBySlugOffer(adapter: string, offer: string): Promise<AuthMethodRecord | undefined>;
    /**
     * Ask the live adapter whether it is actually usable and persist the answer. Called from the
     * per-module admin pages after the operator edits credentials, so "saved" and "works" stop
     * being the same claim.
     *
     * A row flagged `conflict` is left alone: its health is not a question about the provider, it
     * is a question about which module owns the slug, and only a restart answers that (§4.1).
     */
    runHealthcheck(adapter: string, offer?: string): Promise<{
        ok: boolean;
        message?: string;
    }>;
    /** Effective "how many identities of this adapter can one user hold" (extend_user_account §4.1). */
    effectiveMaxPerUser(adapter: string): Promise<number>;
    toPublic: typeof toPublic;
};
declare global {
    const AuthMethod: typeof Model & ORMModel<AuthMethodRecord, "adapter" | "offer">;
}
export {};
