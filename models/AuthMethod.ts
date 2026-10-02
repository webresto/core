import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";
import { v4 as uuid } from "uuid";
import { OptionalAll, RequiredField } from "../interfaces/toolsTS";
import type AuthAdapter from "../adapters/auth/AuthAdapter";
import type { AuthFlowKind, PhoneProofMode, SecretOrigin, Offer } from "../adapters/auth/AuthAdapter";
import { isPrimaryWorker } from "../libs/cluster";

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

let attributes = {
  id: {
    type: "string",
  } as unknown as string,

  /** slug of the module that owns the capability: telegram, max, smsc, zvonok, core, … */
  adapter: {
    type: "string",
    required: true,
  } as unknown as string,

  /** capability this row declares: identity | sms | flashcall | callback | voice | … */
  offer: {
    type: "string",
    required: true,
  } as unknown as string,

  // ---- declared by the adapter's code at alive() — the operator does not edit these (И4) ----

  kind: {
    type: "string",
    isIn: ["identity", "phone_proof"],
  } as unknown as AuthMethodKind,

  /** only kind=identity; null on a phone_proof row */
  flow: {
    type: "string",
    allowNull: true,
  } as unknown as AuthFlowKind,

  /** only kind=phone_proof; null on an identity row */
  mode: {
    type: "string",
    allowNull: true,
  } as unknown as PhoneProofMode,

  /** only kind=phone_proof: who invented the secret */
  secretOrigin: {
    type: "string",
    allowNull: true,
  } as unknown as SecretOrigin,

  /** only kind=phone_proof, mode=enter_code: how many digits the field needs (flashcall may be 4, SMS 6) */
  codeLength: {
    type: "number",
    allowNull: true,
  } as unknown as number,

  /** only kind=identity: does the provider itself guarantee the phone (bot contact, …) */
  canVerifyPhone: {
    type: "boolean",
  } as unknown as boolean,

  /** appId of the module that supplies this row (like SalesChannel.providerModule) */
  providerModule: {
    type: "string",
    allowNull: true,
  } as unknown as string,

  /** ready | needs_setup | error | conflict — updated by alive()/healthcheck() */
  healthStatus: "string" as unknown as AuthMethodHealth,

  // ---- business decisions — the operator edits these ----

  enable: {
    type: "boolean",
  } as unknown as boolean,

  sortOrder: "number" as unknown as number,

  titleKey: "string",
  hintKey: "string",
  iconUrl: "string",
  buttonColor: "string",
  buttonTextColor: "string",

  /** which purposes this row is allowed for: login | link | verify:phone | verify:delete_account | … */
  purposes: "json" as unknown as string[],

  countries: "json" as unknown as string[],
  salesChannels: "json" as unknown as string[],

  ttlSec: "number" as unknown as number,
  resendAfterSec: "number" as unknown as number,
  cost: "number" as unknown as number,

  /** only kind=identity: send a phone-verification SMS after this provider's login anyway */
  requirePhoneVerification: {
    type: "boolean",
  } as unknown as boolean,

  /** operator override of AUTH_MAX_IDENTITIES_PER_ADAPTER for this one adapter (null = inherit) */
  maxPerUser: {
    type: "number",
    allowNull: true,
  } as unknown as number | null,

  /** secrets/keys — NEVER exposed through GraphQL */
  config: "json" as unknown as { [key: string]: string | boolean | number } | string,

  customData: "json" as unknown as { [key: string]: string | boolean | number } | string,
};

type attributes = typeof attributes;
export interface AuthMethodRecord extends RequiredField<OptionalAll<attributes>, "adapter" | "offer">, ORM {}

/** Live adapter instances that self-registered on boot, keyed by "adapter:offer". */
const aliveInstances = new Map<string, AuthAdapter>();

const PUBLIC_FIELDS: (keyof AuthMethodPublic)[] = [
  "adapter", "offer", "kind", "flow", "mode", "canVerifyPhone",
  "sortOrder", "cost", "healthStatus",
];

function rowKey(adapter: string, offer: string): string {
  return `${adapter}:${offer}`;
}

/**
 * What a freshly created row is allowed to be used for, before an operator touches it.
 *
 * A code-carrying method has to cover the guarded operations too, or `verify:delete_account`
 * would find no method at all and the mutation would be unreachable. Which methods are too weak
 * for those operations is then the operator's call on the row — design2 §10.3 makes exactly that
 * point about dial-in: cheapest, and the most exposed to social engineering, so allow it for
 * `login` and forbid it for `verify:delete_account`.
 *
 * An identity provider gets `verify:phone` only when the protocol actually proves a number;
 * otherwise "sign in with it" and "link it" are all it can honestly offer.
 */
function defaultPurposes(offer: Offer): string[] {
  if (offer.kind === "phone_proof") {
    return ["login", "link", "verify:phone", "verify:phone_change",
            "verify:delete_account", "verify:link_identity", "verify:unlink_identity"];
  }
  return offer.canVerifyPhone ? ["login", "link", "verify:phone"] : ["login", "link"];
}

function toPublic(row: AuthMethodRecord): AuthMethodPublic {
  const out: any = {};
  for (const f of PUBLIC_FIELDS) out[f] = (row as any)[f];
  out.title = row.titleKey || row.adapter;
  out.hint = row.hintKey || undefined;
  out.iconUrl = row.iconUrl ?? undefined;
  out.buttonColor = row.buttonColor ?? undefined;
  out.buttonTextColor = row.buttonTextColor ?? undefined;
  return out as AuthMethodPublic;
}

let Model = {
  beforeCreate(record: AuthMethodRecord, cb: (err?: string) => void) {
    if (!record.id) record.id = uuid();
    cb();
  },

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
  async alive(adapter: AuthAdapter): Promise<void> {
    // New rows start disabled unless the operator said otherwise — except for adapters that
    // declare `enabledByDefault` (the core's own OTP): a baseline that starts switched off is not
    // a safe default, it is an installation where nobody can sign in (review2 §1.1).
    const defaultEnable = (await Settings.get("DEFAULT_ENABLE_AUTH_PROVIDERS")) ?? false;

    for (const offer of adapter.offers) {
      const key = rowKey(adapter.slug, offer.offer);
      const existingInstance = aliveInstances.get(key);

      if (existingInstance && existingInstance !== adapter) {
        sails.log.error(
          `AuthMethod > conflict: adapter [${adapter.slug}] offer [${offer.offer}] is already served by another module instance`
        );
        await AuthMethod.updateOne({ adapter: adapter.slug, offer: offer.offer }, { healthStatus: "conflict" });
        continue;
      }

      // First, and unconditionally: the instance is what makes this process able to serve the
      // row, and nothing below may stand between the adapter and that fact.
      aliveInstances.set(key, adapter);

      const known = await AuthMethod.ensureRow(adapter, offer, defaultEnable as boolean);

      // Refresh code-owned fields (they can change between module versions). Never touch
      // operator-owned fields (enable/purposes/sortOrder/...) on re-registration.
      const declared: Partial<AuthMethodRecord> = {
        kind: offer.kind,
        flow: offer.kind === "identity" ? offer.flow : null,
        mode: offer.kind === "phone_proof" ? offer.mode : null,
        secretOrigin: offer.kind === "phone_proof" ? offer.secretOrigin : null,
        canVerifyPhone: offer.kind === "identity" ? Boolean(offer.canVerifyPhone) : false,
        providerModule: adapter.providerModule ?? known.providerModule ?? null,
      };

      if (!isPrimaryWorker()) {
        await AuthMethod.updateOne({ adapter: adapter.slug, offer: offer.offer }, declared);
        sails.log.silly("AuthMethod > alive (secondary worker, health left to the primary)", adapter.slug, offer.offer);
        continue;
      }

      let health: { ok: boolean; message?: string } = { ok: true };
      try {
        health = await adapter.healthcheck();
      } catch (e) {
        health = { ok: false, message: `${e}` };
      }

      await AuthMethod.updateOne({ adapter: adapter.slug, offer: offer.offer }, {
        ...declared,
        healthStatus: health.ok ? "ready" : "needs_setup",
      });

      sails.log.silly("AuthMethod > alive", adapter.slug, offer.offer, health);
    }
  },

  /**
   * The registry row for one (adapter, offer), created on first sight.
   *
   * Not `findOrCreate`: that is a read followed by a write, and two workers booting together
   * both read "nothing there" and both write. The unique index then rejects one of them — which
   * is right for the table and wrong for the worker, whose registration used to reject with it.
   * Here a failed create is answered by reading the row again: if somebody else made it in the
   * meantime, that row is the one we wanted; if nobody did, the error was real and is rethrown.
   */
  async ensureRow(adapter: AuthAdapter, offer: Offer, defaultEnable: boolean): Promise<AuthMethodRecord> {
    const where = { adapter: adapter.slug, offer: offer.offer };
    const found = await AuthMethod.findOne(where);
    if (found) return found;

    try {
      return await AuthMethod.create({
        adapter: adapter.slug,
        offer: offer.offer,
        kind: offer.kind,
        flow: offer.kind === "identity" ? offer.flow : null,
        mode: offer.kind === "phone_proof" ? offer.mode : null,
        secretOrigin: offer.kind === "phone_proof" ? offer.secretOrigin : null,
        canVerifyPhone: offer.kind === "identity" ? Boolean(offer.canVerifyPhone) : false,
        providerModule: adapter.providerModule ?? null,
        healthStatus: "needs_setup",
        enable: adapter.enabledByDefault ?? defaultEnable,
        sortOrder: adapter.sortOrder ?? 0,
        titleKey: adapter.title,
        hintKey: adapter.hint,
        iconUrl: adapter.iconUrl,
        buttonColor: adapter.buttonColor,
        buttonTextColor: adapter.buttonTextColor,
        codeLength: (offer.kind === "phone_proof" ? offer.codeLength : null) ?? null,
        purposes: adapter.defaultPurposes ?? defaultPurposes(offer),
        requirePhoneVerification: offer.kind === "identity" ? Boolean(adapter.requirePhoneVerification) : false,
        cost: adapter.cost ?? 0,
      }).fetch();
    } catch (e) {
      const raced = await AuthMethod.findOne(where);
      if (raced) return raced;
      throw e;
    }
  },

  /** Live adapter instance serving a given (adapter, offer) pair, if any. */
  getAdapter(adapter: string, offer: string): AuthAdapter | undefined {
    return aliveInstances.get(rowKey(adapter, offer));
  },

  /** Live adapter instance for a slug, regardless of which offer resolved it (first match). */
  getAdapterBySlug(adapter: string): AuthAdapter | undefined {
    for (const [key, instance] of aliveInstances) {
      if (key.startsWith(`${adapter}:`)) return instance;
    }
    return undefined;
  },

  /**
   * Rows usable for `purpose`, filtered by enable/health/country/salesChannel, sorted by
   * sortOrder. `kind` narrows to identity buttons or phone_proof verification methods.
   * Identity rows with `canVerifyPhone` are ALSO phone_proof-eligible (design2 §4.1) — pass
   * `includeVerifyingIdentities: true` when building the verification-method list.
   */
  async getForPurpose(purpose: string, ctx: { kind?: AuthMethodKind; salesChannel?: string; country?: string; includeVerifyingIdentities?: boolean } = {}): Promise<AuthMethodRecord[]> {
    const rows = await AuthMethod.find({
      // "conflict" (slug fight) and "needs_setup"/"error" (failed healthcheck) are all reasons a
      // row must not reach the client — only "ready" is (review1 §2: the comment already promised
      // this, the query only kept its word for `conflict`).
      where: { enable: true, healthStatus: "ready" },
      sort: "sortOrder ASC",
    });

    return rows.filter((row) => {
      if (!aliveInstances.has(rowKey(row.adapter, row.offer))) return false;
      if (ctx.kind === "phone_proof" && row.kind !== "phone_proof" && !(ctx.includeVerifyingIdentities && row.canVerifyPhone)) return false;
      if (ctx.kind === "identity" && row.kind !== "identity") return false;
      // An unparsed/absent list means "never used" — refuse rather than guess a permission.
      if (!Array.isArray(row.purposes) || !row.purposes.includes(purpose)) return false;
      if (ctx.salesChannel && Array.isArray(row.salesChannels) && row.salesChannels.length && !row.salesChannels.includes(ctx.salesChannel)) return false;
      if (ctx.country && Array.isArray(row.countries) && row.countries.length && !row.countries.includes(ctx.country.toUpperCase())) return false;
      return true;
    });
  },

  async getBySlugOffer(adapter: string, offer: string): Promise<AuthMethodRecord | undefined> {
    return await AuthMethod.findOne({ adapter, offer });
  },

  /**
   * Ask the live adapter whether it is actually usable and persist the answer. Called from the
   * per-module admin pages after the operator edits credentials, so "saved" and "works" stop
   * being the same claim.
   *
   * A row flagged `conflict` is left alone: its health is not a question about the provider, it
   * is a question about which module owns the slug, and only a restart answers that (§4.1).
   */
  async runHealthcheck(adapter: string, offer: string = "identity"): Promise<{ ok: boolean; message?: string }> {
    const instance = aliveInstances.get(rowKey(adapter, offer));
    if (!instance) return { ok: false, message: `No live adapter for ${adapter}:${offer}` };

    const row = await AuthMethod.findOne({ adapter, offer });
    if (row?.healthStatus === "conflict") {
      return { ok: false, message: `Another module already serves ${adapter}:${offer}` };
    }

    let health: { ok: boolean; message?: string };
    try {
      health = await instance.healthcheck();
    } catch (e) {
      health = { ok: false, message: `${e}` };
    }
    await AuthMethod.updateOne({ adapter, offer }, { healthStatus: health.ok ? "ready" : "needs_setup" });
    return health;
  },

  /** Effective "how many identities of this adapter can one user hold" (extend_user_account §4.1). */
  async effectiveMaxPerUser(adapter: string): Promise<number> {
    if (adapter === "phone") return Number((await Settings.get("AUTH_MAX_PHONE_IDENTITIES")) ?? 1);
    const row = await AuthMethod.findOne({ adapter, kind: "identity" });
    if (row && row.maxPerUser !== null && row.maxPerUser !== undefined) return Number(row.maxPerUser);
    return Number((await Settings.get("AUTH_MAX_IDENTITIES_PER_ADAPTER")) ?? 1);
  },

  toPublic,
};

module.exports = {
  primaryKey: "id",
  /** Config rows carry secrets — never autogenerate a GraphQL type. Public projection: AuthMethodView. */
  graphql: { public: false },
  attributes: attributes,
  ...Model,
};

declare global {
  const AuthMethod: typeof Model & ORMModel<AuthMethodRecord, "adapter" | "offer">;
}
