import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";
import { OptionalAll, RequiredField } from "../interfaces/toolsTS";
/** What made the delivery happen — for the operator reading the log, not for the budget. */
export type AuthSendKind = "send" | "resend";
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
declare let attributes: {
    id: string;
    /** normalized login the delivery was aimed at — the ONLY key the budget is computed by (И6) */
    target: string;
    /**
     * Plain id, not a `model:` association on purpose: attempts are deleted by cleanupExpired and
     * the budget has to outlive them — a cascade would delete exactly the history an attacker
     * wants gone.
     */
    attempt: string;
    /**
     * Who asked. For incident review only — deliberately NOT a budget key: `deviceId` comes from
     * the client and an IP is one proxy away, so a per-source cap bounds an honest client and
     * nobody else. The boundary is the ledger total (send-caps.md §0).
     */
    deviceId: string;
    adapter: string;
    offer: string;
    kind: AuthSendKind;
    /** when it went out; a plain number so the window queries do not depend on createdAt semantics */
    at: number;
};
type attributes = typeof attributes;
export interface AuthSendLogRecord extends RequiredField<OptionalAll<attributes>, "target">, ORM {
}
declare let Model: {
    beforeCreate(record: AuthSendLogRecord, cb: (err?: string) => void): void;
    /** Write the fact of a delivery. Called from the one place that is allowed to spend — AuthService. */
    record(entry: {
        target: string;
        attempt?: string;
        deviceId?: string;
        adapter?: string;
        offer?: string;
        kind?: AuthSendKind;
    }): Promise<AuthSendLogRecord>;
    /** When the last thing was sent to this target, over ALL attempts — the antiflood clock (И6). */
    lastAt(target: string): Promise<number | null>;
    /** How many deliveries this target has had since `since` — the hourly/daily caps. */
    countSince(target: string, since: number): Promise<number>;
    /**
     * How many deliveries went out in total since `since` — over every target, device and method.
     * A separate method rather than `countSince(null, …)` on purpose: "no target" and "all targets"
     * are opposite answers (0 vs everything), and a caller that gets them mixed up silently buys
     * either no cap at all or a cap on the wrong thing (send-caps.md §1.1).
     *
     * This is the only cap an attacker cannot walk around by changing where they come from: the
     * source of a send is not a boundary, the bill is (send-caps.md §0).
     */
    countAllSince(since: number): Promise<number>;
    /** Drop what is past every window a cap can ask about. */
    cleanup(retentionMs?: number): Promise<number>;
};
declare global {
    const AuthSendLog: typeof Model & ORMModel<AuthSendLogRecord, "target">;
}
export {};
