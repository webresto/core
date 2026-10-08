"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
/**
 * Statuses an attempt cannot come back from. Lives here, next to the expiry marking that has to
 * respect it, and is read everywhere else through `AuthAttempt.isTerminal` — the list used to be
 * written out a second time in `AuthService.view()`, where it was obliged to agree by hand.
 *
 * Not exported as a const on purpose: this file ends in `module.exports =`, so a named export
 * would compile away to undefined at runtime.
 */
const TERMINAL = ["done", "failed", "expired", "superseded"];
/** Default TTL for an in-flight attempt (ms), used only before AUTH_STATE_TTL_SECONDS can be read. */
const DEFAULT_TTL_MS = 10 * 60 * 1000;
/** An attempt may be extended by resends up to this multiple of the base TTL, never beyond. */
const MAX_TTL_EXTENSION_FACTOR = 3;
/**
 * How long a finished attempt is kept after it expires. A `done` row outlives its TTL on purpose:
 * `consumeTicket` has to be able to tell "already spent" from "never existed", and the row is the
 * audit trail of how an account was entered. But "on purpose" is not "forever" — every successful
 * login used to leave a permanent row (review1 §3), secret column and all.
 */
const DONE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
/**
 * The single state machine for anything that needs proof: phone login, social login, linking
 * a second way in from the cabinet, confirming a dangerous operation. Absorbs the former
 * AuthState + OneTimePassword (+ the never-built VerificationAttempt) — see design2 §4.3.
 */
let attributes = {
    /** uuid, NOT autoIncrement — the address of the attempt, known only to its owner (§10.2) */
    id: {
        type: "string",
    },
    purpose: {
        type: "string",
        required: true,
    },
    /** owner of the attempt; authStatus/ticket issuance check this */
    deviceId: {
        type: "string",
        required: true,
    },
    /** known immediately for link/verify:*; for login, only once resolved */
    user: {
        model: "user",
    },
    /** current AuthMethod row, "adapter:offer" — changes via authSwitch */
    methodAdapter: { type: "string", allowNull: true },
    methodOffer: { type: "string", allowNull: true },
    /** login string being proven (phone digits) — write-once per step (И7) */
    target: { type: "string", allowNull: true },
    /** what to show the client right now; step.id is the version, regenerated on any target/method change */
    step: "json",
    /**
     * Denormalized copy of step.type, so the sentAt CAS claim can be one atomic conditional
     * UPDATE without reaching into JSON (design2 §8 И8's example query).
     */
    stepType: { type: "string", allowNull: true },
    /** the code itself — CSPRNG; never leaves the server (D10) */
    secret: { type: "string", allowNull: true },
    secretExpiresAt: { type: "number", allowNull: true },
    /** wrong guesses so far; secret is destroyed once the per-attempt budget is spent */
    wrongGuesses: "number",
    /** CAS marker: when the code/call was actually dispatched. null = not sent yet (И8) */
    sentAt: { type: "number", allowNull: true },
    resends: "number",
    switches: "number",
    /** flashcall: full caller number — server-internal ONLY, never serialized to GraphQL (И1, §10.1) */
    callerNumber: { type: "string", allowNull: true },
    /**
     * Provider-side ref of OUR OUTBOUND request, not the id of an incoming event: for dial-in it
     * is the leased DNIS, which is how an ANI signal finds the attempt that rented it. Idempotency
     * of incoming signals does NOT live here — it is the CAS on status/stepType/ticket every entry
     * point does (И15, signal-idempotency.md §1). The index stays: the ANI lookup reads it.
     */
    providerRef: { type: "string", allowNull: true },
    /** social login: profile pending confirmation, plus PKCE/OIDC scratch — never exposed */
    pendingProfile: "json",
    /**
     * Reserved for OIDC/PKCE adapters: nothing in core writes these today (the shipped adapters are
     * OAuth2-with-`state` and phone-proof, whose replay guard is the attempt id itself). They are
     * the per-attempt scratch space such an adapter would need, kept in the schema so adding one is
     * an adapter and not a migration — the columns exist and are covered by the same "never
     * projected" rule as `secret` (review1 §4).
     */
    nonce: { type: "string", allowNull: true },
    codeVerifier: { type: "string", allowNull: true },
    /**
     * One-time result of a successful attempt; exchanged for a JWT or fed into a guarded mutation.
     * NULL on every live row: AuthService.complete mints it in its claiming UPDATE (И15), so a
     * non-null ticket means claimed-or-done. Redeemable only at status `done` (consumeTicket), so
     * one sitting on a row that is still being completed is inert.
     */
    ticket: { type: "string", allowNull: true },
    ticketConsumedAt: { type: "number", allowNull: true },
    status: {
        type: "string",
        isIn: ["started", "awaiting_user", "done", "failed", "expired", "superseded"],
    },
    failReason: { type: "string", allowNull: true },
    /** provider-module scratch data, opaque to the core (e.g. { maxUserId, maxChatId }) */
    customData: "json",
    /** TTL — cleaned by cron; extended (capped) whenever a code is actually sent */
    expiresAt: "number",
};
let Model = {
    beforeCreate(record, cb) {
        if (!record.id)
            record.id = (0, uuid_1.v4)();
        if (!record.status)
            record.status = "started";
        if (record.wrongGuesses === undefined)
            record.wrongGuesses = 0;
        if (record.resends === undefined)
            record.resends = 0;
        if (record.switches === undefined)
            record.switches = 0;
        if (record.step?.type)
            record.stepType = record.step.type;
        if (!record.expiresAt) {
            // beforeCreate is sync; AuthService.start() overwrites this with the configured TTL.
            record.expiresAt = Date.now() + DEFAULT_TTL_MS;
        }
        cb();
    },
    /** Has this attempt already answered? The one list; `AuthService.view()` asks through here. */
    isTerminal(status) {
        return TERMINAL.includes(status);
    },
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
    async load(id, opts = {}) {
        const attempt = await AuthAttempt.findOne({ id });
        if (!attempt)
            return undefined;
        if (opts.deviceId && attempt.deviceId !== opts.deviceId)
            return undefined;
        // The deadline rewrites a NON-terminal status only. `failed` and `superseded` are already an
        // answer, and turning one into `expired` afterwards changes the reason for a refusal under a
        // client that is still polling the attempt (review3 §5.5); `done` keeps its status because
        // past that moment `expiresAt` means "the ticket is still good" and nothing else.
        if (!AuthAttempt.isTerminal(attempt.status) && Number(attempt.expiresAt || 0) < Date.now()) {
            await AuthAttempt.updateOne({ id }, { status: "expired" });
            return opts.liveOnly ? undefined : (await AuthAttempt.findOne({ id }));
        }
        // Terminal means terminal (review1 §2): a `superseded` attempt must not go on accepting
        // submits (two live attempts instead of the one design2 Д15 intends), and a `done` one
        // replayed within its TTL must not run `complete()` again.
        if (opts.liveOnly && AuthAttempt.isTerminal(attempt.status))
            return undefined;
        return attempt;
    },
    /** Configured attempt lifetime in ms (AUTH_STATE_TTL_SECONDS). */
    async ttlMs() {
        const sec = await Settings.get("AUTH_STATE_TTL_SECONDS");
        return sec ? Number(sec) * 1000 : DEFAULT_TTL_MS;
    },
    /**
     * Push the deadline out when a code goes out — the user is about to switch to their SMS app
     * and back, and the attempt TTL is shorter than the code TTL. Capped so resends cannot keep
     * an attempt alive forever.
     */
    async extendTtl(id) {
        const attempt = await AuthAttempt.findOne({ id });
        if (!attempt)
            return;
        const ttl = await AuthAttempt.ttlMs();
        const ceiling = Number(attempt.createdAt ?? Date.now()) + ttl * MAX_TTL_EXTENSION_FACTOR;
        const next = Math.min(Date.now() + ttl, ceiling);
        if (next > Number(attempt.expiresAt || 0)) {
            await AuthAttempt.updateOne({ id }, { expiresAt: next });
        }
    },
    /**
     * Delete attempts whose TTL has passed (periodic cleanup), and finished ones past their
     * retention window. Batched: the sweep runs every few minutes, and a delete list the size of a
     * month of logins is not something to hand a single query.
     */
    async cleanupExpired(retentionMs = DONE_RETENTION_MS) {
        const expired = await AuthAttempt.find({ where: { expiresAt: { "<": Date.now() }, status: { "!=": "done" } }, limit: 5000 });
        if (expired.length)
            await AuthAttempt.destroy({ id: expired.map((s) => s.id) });
        // `done` rows are kept past their TTL (the ticket must stay unforgeable-and-spent), then go.
        const retired = await AuthAttempt.find({ where: { status: "done", expiresAt: { "<": Date.now() - retentionMs } }, limit: 5000 });
        if (retired.length)
            await AuthAttempt.destroy({ id: retired.map((s) => s.id) });
        return expired.length + retired.length;
    },
};
module.exports = {
    primaryKey: "id",
    /**
     * Holds server-side secrets (code / nonce / codeVerifier / pendingProfile / callerNumber) —
     * never autogenerate a GraphQL type. The public projection is AuthAttemptView, hand-built.
     */
    graphql: { public: false },
    attributes: attributes,
    ...Model,
};
