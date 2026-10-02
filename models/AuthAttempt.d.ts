import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";
import { OptionalAll, RequiredField } from "../interfaces/toolsTS";
import { NormalizedProfile, StepType } from "../adapters/auth/AuthAdapter";
import { UserRecord } from "./User";
export type AuthAttemptStatus = "started" | "awaiting_user" | "done" | "failed" | "expired" | "superseded";
export type AuthPurpose = "login" | "link" | "verify:phone" | "verify:phone_change" | "verify:delete_account" | "verify:link_identity" | "verify:unlink_identity" | string;
export interface AuthStep {
    id: string;
    type: StepType;
    codeLength?: number;
    hint?: string;
    dialNumber?: string;
    redirectUrl?: string;
    clientPayload?: Record<string, unknown>;
    expiresInSeconds?: number;
    /**
     * The answer to this step arrives from a human or not at all: it names a target we will then
     * spend money on. Set by the server, enforced at the transport boundary — the only place that
     * knows the request came from a client rather than from a webhook or another service.
     */
    captchaRequired?: boolean;
}
/**
 * The single state machine for anything that needs proof: phone login, social login, linking
 * a second way in from the cabinet, confirming a dangerous operation. Absorbs the former
 * AuthState + OneTimePassword (+ the never-built VerificationAttempt) — see design2 §4.3.
 */
declare let attributes: {
    /** uuid, NOT autoIncrement — the address of the attempt, known only to its owner (§10.2) */
    id: string;
    purpose: AuthPurpose;
    /** owner of the attempt; authStatus/ticket issuance check this */
    deviceId: string;
    /** known immediately for link/verify:*; for login, only once resolved */
    user: UserRecord | string;
    /** current AuthMethod row, "adapter:offer" — changes via authSwitch */
    methodAdapter: string;
    methodOffer: string;
    /** login string being proven (phone digits) — write-once per step (И7) */
    target: string;
    /** what to show the client right now; step.id is the version, regenerated on any target/method change */
    step: AuthStep;
    /**
     * Denormalized copy of step.type, so the sentAt CAS claim can be one atomic conditional
     * UPDATE without reaching into JSON (design2 §8 И8's example query).
     */
    stepType: StepType;
    /** the code itself — CSPRNG; never leaves the server (D10) */
    secret: string;
    secretExpiresAt: number;
    /** wrong guesses so far; secret is destroyed once the per-attempt budget is spent */
    wrongGuesses: number;
    /** CAS marker: when the code/call was actually dispatched. null = not sent yet (И8) */
    sentAt: number;
    resends: number;
    switches: number;
    /** flashcall: full caller number — server-internal ONLY, never serialized to GraphQL (И1, §10.1) */
    callerNumber: string;
    /**
     * Provider-side ref of OUR OUTBOUND request, not the id of an incoming event: for dial-in it
     * is the leased DNIS, which is how an ANI signal finds the attempt that rented it. Idempotency
     * of incoming signals does NOT live here — it is the CAS on status/stepType/ticket every entry
     * point does (И15, signal-idempotency.md §1). The index stays: the ANI lookup reads it.
     */
    providerRef: string;
    /** social login: profile pending confirmation, plus PKCE/OIDC scratch — never exposed */
    pendingProfile: NormalizedProfile;
    /**
     * Reserved for OIDC/PKCE adapters: nothing in core writes these today (the shipped adapters are
     * OAuth2-with-`state` and phone-proof, whose replay guard is the attempt id itself). They are
     * the per-attempt scratch space such an adapter would need, kept in the schema so adding one is
     * an adapter and not a migration — the columns exist and are covered by the same "never
     * projected" rule as `secret` (review1 §4).
     */
    nonce: string;
    codeVerifier: string;
    /**
     * One-time result of a successful attempt; exchanged for a JWT or fed into a guarded mutation.
     * NULL on every live row: AuthService.complete mints it in its claiming UPDATE (И15), so a
     * non-null ticket means claimed-or-done. Redeemable only at status `done` (consumeTicket), so
     * one sitting on a row that is still being completed is inert.
     */
    ticket: string;
    ticketConsumedAt: number;
    status: AuthAttemptStatus;
    failReason: string;
    /** provider-module scratch data, opaque to the core (e.g. { maxUserId, maxChatId }) */
    customData: {
        [key: string]: string | number | boolean;
    };
    /** TTL — cleaned by cron; extended (capped) whenever a code is actually sent */
    expiresAt: number;
};
type attributes = typeof attributes;
export interface AuthAttemptRecord extends RequiredField<OptionalAll<attributes>, "purpose" | "deviceId">, ORM {
}
declare let Model: {
    beforeCreate(record: AuthAttemptRecord, cb: (err?: string) => void): void;
    /** Has this attempt already answered? The one list; `AuthService.view()` asks through here. */
    isTerminal(status: string | undefined | null): boolean;
    /**
     * The single reader of an attempt (review3 §2.5). Every caller — poll, submit, webhook, OAuth
     * callback — used to read the row itself and mark expiry on its own terms, and the four copies
     * had drifted into four different answers to the same question.
     *
     * `deviceId` — the row belongs to this device or it does not exist: an attempt id is a secret
     * address (design2 §10.2), and saying "wrong device" only tells a stranger that it is a real
     * one. `liveOnly` — only an attempt that may still be answered comes back, terminal and
     * overdue ones read as undefined.
     *
     * This is a FILTER, not a lock. It reads, and whatever it returns may be stale by the time the
     * caller acts on it — two workers pass it at once for the same webhook. Every write that
     * follows it has to carry its own condition (И15, signal-idempotency.md §3.4); `load` +
     * an unconditional `updateOne` is the shape this exists to stop being written again.
     */
    load(id: string, opts?: {
        deviceId?: string;
        liveOnly?: boolean;
    }): Promise<AuthAttemptRecord | undefined>;
    /** Configured attempt lifetime in ms (AUTH_STATE_TTL_SECONDS). */
    ttlMs(): Promise<number>;
    /**
     * Push the deadline out when a code goes out — the user is about to switch to their SMS app
     * and back, and the attempt TTL is shorter than the code TTL. Capped so resends cannot keep
     * an attempt alive forever.
     */
    extendTtl(id: string): Promise<void>;
    /**
     * Delete attempts whose TTL has passed (periodic cleanup), and finished ones past their
     * retention window. Batched: the sweep runs every few minutes, and a delete list the size of a
     * month of logins is not something to hand a single query.
     */
    cleanupExpired(retentionMs?: number): Promise<number>;
};
declare global {
    const AuthAttempt: typeof Model & ORMModel<AuthAttemptRecord, "purpose" | "deviceId">;
}
export {};
