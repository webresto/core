import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";
import { OptionalAll, RequiredField } from "../interfaces/toolsTS";
import { UserRecord } from "./User";
import { Phone } from "./User";
export interface AuthIdentityProof {
    at: number;
    /** offer served: sms | flashcall | callback | telegram | max | … */
    method: string;
    /** adapter slug that produced the proof */
    adapter: string;
    purpose: string;
}
/**
 * The fact "external account X at provider P belongs to User U". Logical unique key
 * (provider, externalId), enforced at the DB level (design2 Д3). One User may have several
 * identities of the same provider, bounded by cardinality policy (extend_user_account §4).
 *
 * The phone is ALSO an identity: provider:"phone", externalId = normalized digits. It is the one
 * internal provider — it has no AuthMethod row because it has no adapter, the core owns it
 * directly (extend_user_account §3.2). Email is NOT one of these: the core cannot prove an
 * address, so it never anchors an account (review3 §1.2).
 */
declare let attributes: {
    id: string;
    /** slug (== AuthMethod.adapter), or the internal "phone" */
    provider: string;
    /** sub / uid / telegram id / max id / normalized phone digits */
    externalId: string;
    user: UserRecord | string;
    /** Denormalized profile snapshot — a CLAIM, not the source of truth (design2 §4.2). No email
     * here: a second copy of an address nothing ever read. The provider's address lands on
     * `User.email` when an account is created from the profile, as a contact, never a way in. */
    phone: Phone;
    displayName: string;
    avatarUrl: string;
    /**
     * Explicit proof of ownership. null = claimed but never proven (guest order phone, provider
     * profile attribute never confirmed in an AuthAttempt). Written ONLY from the point where an
     * AuthAttempt completes successfully — never implied by the schema (design2 И3).
     */
    proof: AuthIdentityProof | null;
    /** How to show this identity in the cabinet: "Personal", "Work", @username, … */
    label: string;
    /** When this identity was attached — anchors the incumbent-protection window (§7.2) */
    linkedAt: number;
    /** Last successful login THROUGH this identity */
    lastUsedAt: number;
    /** id of the AuthAttempt that created this link — audit / incident review */
    linkedVia: string;
    /** Provider tokens, if needed for repeat calls. Encrypt at rest. */
    tokens: {
        accessToken?: string;
        refreshToken?: string;
        expiresAt?: number;
    };
};
type attributes = typeof attributes;
export interface AuthIdentityRecord extends RequiredField<OptionalAll<attributes>, "provider" | "externalId">, ORM {
}
declare let Model: {
    beforeCreate: (record: AuthIdentityRecord, cb: (err?: string) => void) => void;
    /** Find an identity by the logical unique key. */
    findByExternal(provider: string, externalId: string): Promise<AuthIdentityRecord | undefined>;
    /** Whether `identity` was linked within the incumbent-protection window (§7.2). */
    isWithinProtectionWindow(identity: AuthIdentityRecord): Promise<boolean>;
};
declare global {
    const AuthIdentity: typeof Model & ORMModel<AuthIdentityRecord, "provider" | "externalId">;
}
export {};
