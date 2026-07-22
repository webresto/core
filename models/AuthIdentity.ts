import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";
import { v4 as uuid } from "uuid";
import { OptionalAll, RequiredField } from "../interfaces/toolsTS";
import { UserRecord } from "./User";
import { Phone } from "./User";

/**
 * The fact "external account X at provider P belongs to User U".
 * Logical unique key: (provider, externalId). One User may have many identities
 * (telegram + max + vk). Enables repeat login, multi-provider linking and takeover protection.
 */
let attributes = {
  id: {
    type: "string",
  } as unknown as string,

  /** slug (== AuthProvider.adapter) */
  provider: {
    type: "string",
    required: true,
  } as unknown as string,

  /** sub / uid / telegram id / max id — stable at the provider */
  externalId: {
    type: "string",
    required: true,
  } as unknown as string,

  user: {
    model: "user",
  } as unknown as UserRecord | string,

  /** Denormalized profile snapshot (NOT the source of truth) */
  email: "string",
  phone: "json" as unknown as Phone,
  displayName: "string",
  avatarUrl: "string",

  /**
   * Provider tokens, if needed for repeat calls. Encrypt at rest.
   * { accessToken, refreshToken, expiresAt }
   */
  tokens: "json" as unknown as {
    accessToken?: string;
    refreshToken?: string;
    expiresAt?: number;
  },

  lastLoginAt: "number" as unknown as number,
};

type attributes = typeof attributes;
/**
 * @deprecated use `AuthIdentityRecord` instead
 */
interface AuthIdentity extends RequiredField<OptionalAll<attributes>, "provider" | "externalId">, ORM {}
export interface AuthIdentityRecord extends RequiredField<OptionalAll<attributes>, "provider" | "externalId">, ORM {}

let Model = {
  beforeCreate: function (record: AuthIdentityRecord, cb: (err?: string) => void) {
    if (!record.id) {
      record.id = uuid();
    }
    cb();
  },

  /** Find an identity by the logical unique key. */
  async findByExternal(provider: string, externalId: string): Promise<AuthIdentityRecord | undefined> {
    return await AuthIdentity.findOne({ provider, externalId });
  },
};

module.exports = {
  primaryKey: "id",
  attributes: attributes,
  ...Model,
};

declare global {
  const AuthIdentity: typeof Model & ORMModel<AuthIdentityRecord, "provider" | "externalId">;
}
