import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";
import { v4 as uuid } from "uuid";
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
let attributes = {
  id: {
    type: "string",
  } as unknown as string,

  /** slug (== AuthMethod.adapter), or the internal "phone" */
  provider: {
    type: "string",
    required: true,
  } as unknown as string,

  /** sub / uid / telegram id / max id / normalized phone digits */
  externalId: {
    type: "string",
    required: true,
  } as unknown as string,

  user: {
    model: "user",
  } as unknown as UserRecord | string,

  /** Denormalized profile snapshot — a CLAIM, not the source of truth (design2 §4.2). No email
   * here: a second copy of an address nothing ever read. The provider's address lands on
   * `User.email` when an account is created from the profile, as a contact, never a way in. */
  phone: "json" as unknown as Phone,
  displayName: "string",
  avatarUrl: "string",

  /**
   * Explicit proof of ownership. null = claimed but never proven (guest order phone, provider
   * profile attribute never confirmed in an AuthAttempt). Written ONLY from the point where an
   * AuthAttempt completes successfully — never implied by the schema (design2 И3).
   */
  proof: "json" as unknown as AuthIdentityProof | null,

  /** How to show this identity in the cabinet: "Personal", "Work", @username, … */
  label: { type: "string", allowNull: true } as unknown as string,

  /** When this identity was attached — anchors the incumbent-protection window (§7.2) */
  linkedAt: "number" as unknown as number,

  /** Last successful login THROUGH this identity */
  lastUsedAt: { type: "number", allowNull: true } as unknown as number,

  /** id of the AuthAttempt that created this link — audit / incident review */
  linkedVia: { type: "string", allowNull: true } as unknown as string,

  /** Provider tokens, if needed for repeat calls. Encrypt at rest. */
  tokens: "json" as unknown as {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
  },
};

type attributes = typeof attributes;
export interface AuthIdentityRecord extends RequiredField<OptionalAll<attributes>, "provider" | "externalId">, ORM {}

let Model = {
  beforeCreate: function (record: AuthIdentityRecord, cb: (err?: string) => void) {
    if (!record.id) {
      record.id = uuid();
    }
    if (!record.linkedAt) record.linkedAt = Date.now();
    cb();
  },

  /** Find an identity by the logical unique key. */
  async findByExternal(provider: string, externalId: string): Promise<AuthIdentityRecord | undefined> {
    return await AuthIdentity.findOne({ provider, externalId });
  },

  /** Whether `identity` was linked within the incumbent-protection window (§7.2). */
  async isWithinProtectionWindow(identity: AuthIdentityRecord): Promise<boolean> {
    const hours = Number((await Settings.get("AUTH_INCUMBENT_PROTECT_HOURS")) ?? 24);
    if (!hours) return false;
    return Date.now() - Number(identity.linkedAt || 0) < hours * 3600 * 1000;
  },
};

module.exports = {
  primaryKey: "id",
  /**
   * Holds provider tokens and a denormalized profile — never autogenerate a GraphQL type for
   * them. The public projection lives in @webresto/graphql (type IdentityView).
   */
  graphql: { public: false },
  attributes: attributes,
  ...Model,
};

declare global {
  const AuthIdentity: typeof Model & ORMModel<AuthIdentityRecord, "provider" | "externalId">;
}
