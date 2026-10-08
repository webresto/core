"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
/** How long a row is worth keeping: long enough to cover the widest window a cap can ask about. */
const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;
/**
 * Append-only log of everything ever aimed at a login: one row per SMS, flash-call, dial-in
 * reservation or bot message the server actually spent on a target.
 *
 * The antiflood used to live in `AuthAttempt.sentAt`, i.e. in a mutable field of the very row
 * the user controls the life of: `authSwitch` rewrites the step and nulls `sentAt`, which erased
 * the history the budget was computed from and turned "another way in" into an unmetered SMS
 * pump (review1 §1.2). History that decides whether we may spend money cannot live in a field
 * the flow resets — hence a separate, immutable event stream keyed by target (design2 §7.4,
 * review1 §5.1).
 */
let attributes = {
    id: {
        type: "string",
    },
    /** normalized login the delivery was aimed at — the ONLY key the budget is computed by (И6) */
    target: {
        type: "string",
        required: true,
    },
    /**
     * Plain id, not a `model:` association on purpose: attempts are deleted by cleanupExpired and
     * the budget has to outlive them — a cascade would delete exactly the history an attacker
     * wants gone.
     */
    attempt: { type: "string", allowNull: true },
    /**
     * Who asked. For incident review only — deliberately NOT a budget key: `deviceId` comes from
     * the client and an IP is one proxy away, so a per-source cap bounds an honest client and
     * nobody else. The boundary is the ledger total (send-caps.md §0).
     */
    deviceId: { type: "string", allowNull: true },
    adapter: { type: "string", allowNull: true },
    offer: { type: "string", allowNull: true },
    kind: { type: "string", allowNull: true },
    /** when it went out; a plain number so the window queries do not depend on createdAt semantics */
    at: "number",
};
let Model = {
    beforeCreate(record, cb) {
        if (!record.id)
            record.id = (0, uuid_1.v4)();
        if (!record.at)
            record.at = Date.now();
        cb();
    },
    /** Write the fact of a delivery. Called from the one place that is allowed to spend — AuthService. */
    async record(entry) {
        return await AuthSendLog.create({
            target: entry.target,
            attempt: entry.attempt,
            deviceId: entry.deviceId,
            adapter: entry.adapter,
            offer: entry.offer,
            kind: entry.kind ?? "send",
            at: Date.now(),
        }).fetch();
    },
    /** When the last thing was sent to this target, over ALL attempts — the antiflood clock (И6). */
    async lastAt(target) {
        if (!target)
            return null;
        const [last] = await AuthSendLog.find({ where: { target }, sort: "at DESC", limit: 1 });
        return last ? Number(last.at) : null;
    },
    /** How many deliveries this target has had since `since` — the hourly/daily caps. */
    async countSince(target, since) {
        if (!target)
            return 0;
        return await AuthSendLog.count({ target, at: { ">": since } });
    },
    /**
     * How many deliveries went out in total since `since` — over every target, device and method.
     * A separate method rather than `countSince(null, …)` on purpose: "no target" and "all targets"
     * are opposite answers (0 vs everything), and a caller that gets them mixed up silently buys
     * either no cap at all or a cap on the wrong thing (send-caps.md §1.1).
     *
     * This is the only cap an attacker cannot walk around by changing where they come from: the
     * source of a send is not a boundary, the bill is (send-caps.md §0).
     */
    async countAllSince(since) {
        return await AuthSendLog.count({ at: { ">": since } });
    },
    /** Drop what is past every window a cap can ask about. */
    async cleanup(retentionMs = RETENTION_MS) {
        const stale = await AuthSendLog.find({ where: { at: { "<": Date.now() - retentionMs } }, limit: 5000 });
        if (stale.length)
            await AuthSendLog.destroy({ id: stale.map((r) => r.id) });
        return stale.length;
    },
};
module.exports = {
    primaryKey: "id",
    /** Says who was called and when — an internal ledger, never a GraphQL type. */
    graphql: { public: false },
    attributes: attributes,
    ...Model,
};
