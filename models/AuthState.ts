import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";
import { v4 as uuid } from "uuid";
import { OptionalAll, RequiredField } from "../interfaces/toolsTS";
import { NormalizedProfile } from "../adapters/auth/AuthProviderAdapter";

export type AuthStateStatus = "started" | "awaiting_phone" | "done" | "expired";

/** Default TTL for an in-flight login attempt (ms). */
const DEFAULT_TTL_MS = 10 * 60 * 1000;

/**
 * Ephemeral state of a single login attempt. Holds the oauth state/nonce/PKCE and,
 * for social logins waiting on phone confirmation, the pending profile. TTL-cleaned.
 * `id` doubles as the oauth `state` parameter.
 */
let attributes = {
  /** == oauth `state` */
  id: {
    type: "string",
  } as unknown as string,

  provider: {
    type: "string",
    required: true,
  } as unknown as string,

  /** the UserDevice that initiated the login */
  deviceId: {
    type: "string",
    required: true,
  } as unknown as string,

  /** PKCE / OIDC */
  nonce: "string",
  codeVerifier: "string",

  redirectBack: "string",
  salesChannel: "string",
  country: "string",
  locale: "string",

  /** NormalizedProfile of a social login that still needs a confirmed phone */
  pendingProfile: "json" as unknown as NormalizedProfile,

  status: {
    type: "string",
    isIn: ["started", "awaiting_phone", "done", "expired"],
  } as unknown as AuthStateStatus,

  /** login string used for the OTP request while awaiting phone confirmation */
  otpLogin: "string",

  /** once done: the User this attempt resolved to (for authStatus polling) */
  resolvedUser: "string",
  /** one-time ticket the browser exchanges for a JWT (OAuth redirect flow) */
  authTicket: "string",

  /**
   * Provider-specific scratch data for this attempt, owned by the provider module — the core
   * never interprets it. Bot flows (Telegram/MAX) use it to remember the chat that started the
   * login (e.g. { telegramChatId }) so a later "share contact" message can be matched back to
   * this AuthState, since that message does not carry the `/start <stateId>` param.
   */
  customData: "json" as unknown as {
    [key: string]: string | number | boolean;
  },

  /** TTL — cleaned by cron/afterHook */
  expiresAt: "number" as unknown as number,
};

type attributes = typeof attributes;
/**
 * @deprecated use `AuthStateRecord` instead
 */
interface AuthState extends RequiredField<OptionalAll<attributes>, "provider" | "deviceId">, ORM {}
export interface AuthStateRecord extends RequiredField<OptionalAll<attributes>, "provider" | "deviceId">, ORM {}

let Model = {
  beforeCreate: function (record: AuthStateRecord, cb: (err?: string) => void) {
    if (!record.id) {
      record.id = uuid();
    }
    if (!record.status) {
      record.status = "started";
    }
    if (!record.expiresAt) {
      record.expiresAt = Date.now() + DEFAULT_TTL_MS;
    }
    cb();
  },

  /** Fetch a non-expired state. Marks expired ones and returns undefined. */
  async getActive(stateId: string): Promise<AuthStateRecord | undefined> {
    const state = await AuthState.findOne({ id: stateId });
    if (!state) return undefined;
    if (state.expiresAt && state.expiresAt < Date.now()) {
      await AuthState.updateOne({ id: stateId }, { status: "expired" });
      return undefined;
    }
    return state;
  },

  /** Delete states whose TTL has passed (called from a periodic cleanup). */
  async cleanupExpired(): Promise<number> {
    const expired = await AuthState.find({ where: { expiresAt: { "<": Date.now() } } });
    if (expired.length) {
      await AuthState.destroy({ id: expired.map((s) => s.id) });
    }
    return expired.length;
  },
};

module.exports = {
  primaryKey: "id",
  attributes: attributes,
  ...Model,
};

declare global {
  const AuthState: typeof Model & ORMModel<AuthStateRecord, "provider" | "deviceId">;
}
