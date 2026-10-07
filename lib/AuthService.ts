import * as crypto from "crypto";
import { v4 as uuid } from "uuid";
import AuthAdapter, { NormalizedProfile, Offer, Signal, StepType } from "../adapters/auth/AuthAdapter";
import { AuthAttemptRecord, AuthPurpose, AuthStep } from "../models/AuthAttempt";
import { AuthIdentityProof, AuthIdentityRecord } from "../models/AuthIdentity";
import { AuthMethodRecord } from "../models/AuthMethod";
import { Phone, UserRecord } from "../models/User";
import { NotificationService } from "./notifications/NotificationService";
import getEmitter from "./getEmitter";

/**
 * Country calling codes, longest first. The same dictionary `User.phone`'s own validator checks
 * against — so a code produced here is a code that model will accept, which is the whole point.
 */
const COUNTRIES = require("./dictionaries/countries.json") as { phoneCode: string; iso: string }[];

const PHONE_CODES: string[] = Array.from(new Set(COUNTRIES.map((c) => String(c.phoneCode).replace(/\D/g, ""))))
  .filter(Boolean)
  .sort((a, b) => b.length - a.length);

/**
 * Memo for the "another way in" list a poll returns. Building it asks every registry row's
 * `supports()`, which the adapter contract warns may cost money (an HLR lookup) — and the SPA
 * polls authStatus about once a second, so the list was being bought over and over for an answer
 * that only changes when the target does (review1 §3).
 *
 * In memory and not on the attempt on purpose: this is a view, not a fact. A worker that has
 * never seen the attempt just computes it once, and nothing here can clobber a concurrent write
 * to `customData`.
 */
const METHODS_MEMO = new Map<string, { key: string; methods: string[]; at: number }>();
const METHODS_MEMO_TTL_MS = 60 * 1000;
const METHODS_MEMO_MAX = 5000;

/**
 * ISO country code → the calling codes the dictionary lists for it. Rebuilt only when the
 * setting's value changes, since every refused send would otherwise re-scan 238 rows.
 */
const COUNTRY_CODES_MEMO: { key: string; codes: string[] } = { key: "\u0000", codes: [] };

/**
 * Last time each refusal reason was written to the log at warn level. Under an attack every
 * request is a refusal, and a warn per refusal is thousands of lines a minute — which shows up
 * as a spike in `log_errors_total` rather than as a signal anyone can read (send-caps.md §2).
 * Per process, in memory: this paces the log, it does not decide anything.
 */
const REFUSAL_WARNED_AT = new Map<string, number>();
const REFUSAL_WARN_INTERVAL_MS = 60 * 1000;
/** REQUIRE_AUTH_FOR_CART set while nobody can sign in — warned at most once a minute, see cartRequiresAuth(). */
let CART_FLAG_WARNED_AT = 0;

export interface AuthContext {
  deviceId: string;
  deviceName?: string;
  userAgent?: string;
  IP?: string;
  salesChannel?: string;
  country?: string;
  locale?: string;
  redirectBack?: string;
}

export interface StartInput extends AuthContext {
  purpose: AuthPurpose;
  /** "adapter:offer", or a bare adapter slug when the adapter has exactly one usable offer */
  method?: string;
  /** login string to prove: phone digits (the only login string the core knows, review3 §1.2) */
  login?: string;
  /** known up front for link / verify:*; for login it is discovered on the way */
  user?: string;
}

/** Everything a client may legitimately see about an attempt — and nothing else (§10.1). */
export interface AuthAttemptView {
  id: string;
  status: string;
  step: (AuthStep & { expiresInSeconds?: number }) | null;
  ticket: string | null;
  phoneHint: string | null;
  method: string | null;
  availableMethods: string[];
  nextAttemptAfterSeconds: number;
  attemptsLeft: number | null;
  failReason: string | null;
}

export interface IdentityView {
  id: string;
  provider: string;
  title: string;
  hint: string;
  label: string | null;
  isPrimaryPhone: boolean;
  proofAt: number | null;
  proofMethod: string | null;
  linkedAt: number | null;
  lastUsedAt: number | null;
  canUnlink: boolean;
  unlinkBlockedReason: string | null;
}

export interface AccountPolicyView {
  canAddPhone: boolean;
  canChangePhone: boolean;
  maxPhones: number;
  linkable: { provider: string; title: string; freeSlots: number }[];
  noticePolicy: string;
  noticeTargetHint: string | null;
}

/** What applyMethod() was asked for. `kind` only tells the ledger a repeat from a first send. */
interface ApplyOpts {
  deliverNow?: boolean;
  bypassInterval?: boolean;
  kind?: "send" | "resend";
}

/** Whether the row asked for is in charge now, and — when it is not — what refused it. */
interface ApplyResult {
  attempt: AuthAttemptRecord;
  applied: boolean;
  reason?: string;
}

/** Reasons the service refuses, as stable codes the frontend can branch on. */
export const AUTH_FAIL = {
  wrongCode: "wrong_code",
  codeLocked: "code_locked",
  expired: "expired",
  staleStep: "stale_step",
  phoneMismatch: "phone_mismatch",
  sendFailed: "send_failed",
  rateLimited: "rate_limited",
  switchLimit: "switch_limit",
  noMethod: "no_method",
  identityTaken: "identity_taken",
  identityLimit: "identity_limit_reached",
  phoneChangeDisabled: "phone_change_disabled",
  confirmRequired: "confirm_required",
  lastLoginMethod: "last_login_method",
  phoneRequired: "phone_required",
  protectWindow: "protect_window",
  countryNotAllowed: "country_not_allowed",
  noIncumbent: "no_incumbent",
} as const;

/**
 * Purposes whose target belongs to the ACCOUNT, not to whoever is holding the session.
 *
 * A step-up before a dangerous operation has to prove the incumbent, and `login` arrives from
 * the client: left alone, `authStart(purpose: "verify:delete_account", login: <attacker's own
 * number>)` mints a ticket that `consumeTicket` then accepts, because everything it checks —
 * purpose, userId (from the JWT), deviceId — is exactly what somebody who took over the session
 * already has. That is self-issued step-up: the ticket proved a number, never the account
 * (review2 §1.2, extend §7.1). For these purposes the target is read from the account here and
 * the client's `login` is ignored.
 *
 * `verify:phone` / `verify:phone_change` are deliberately NOT in this set: they are about a new
 * number by definition. `link` likewise proves the identity being added.
 */
const INCUMBENT_BOUND_PURPOSES: string[] = [
  "verify:delete_account",
  "verify:link_identity",
  "verify:unlink_identity",
];

/**
 * Which cap refused a delivery — a closed set, because it is a Prometheus label
 * (send-caps.md §2). Nothing identifying belongs next to it: not the number, not the device id.
 * The client is told `rate_limited` for all of these but `country`, so the axis lives here and
 * in the log only.
 */
export type AuthSendRefusal = "interval" | "target_hour" | "target_day" | "global_hour" | "country" | "live_attempts";

/**
 * The steps an `identity` offer publishes — the ones a provider profile is an answer to. Named
 * once because every CAS that consumes a profile has to name the same pair (И15).
 */
const IDENTITY_STEP_TYPES: StepType[] = ["redirect", "provider_dialog"];

/**
 * The steps a `phone_proof` offer publishes once the target is known — everything "send it
 * again" can legitimately be asked about.
 */
const PROOF_STEP_TYPES: StepType[] = ["enter_code", "dial_number", "await_signal"];

/**
 * Refusals the account policy makes deterministically while an attempt is being completed. They
 * are outcomes of the attempt, not faults of the system, and `complete()` writes them onto the
 * row as `failReason` instead of throwing: half of its callers are webhooks, and a webhook has
 * nobody to throw to (review2 §3). A closed set on purpose — anything else that escapes is a
 * fault, and a fault releases the claim and propagates.
 */
const COMPLETE_REFUSALS: string[] = [AUTH_FAIL.identityTaken, AUTH_FAIL.identityLimit, AUTH_FAIL.phoneChangeDisabled];

/**
 * The single orchestrator (design2 §6). It owns the whole life of an AuthAttempt: picking a
 * registry row, the invisible provider waterfall inside one method, the compare-and-set send,
 * resolving a profile into a User, writing `proof`, and consuming tickets.
 *
 * Nothing else in the codebase creates a User, writes `User.verified`, or decides whether a
 * phone counts as proven — that is the entire reason this class exists (design2 Д2/Д6/Д7).
 */
export class AuthService {
  // ────────────────────────────────────────────────────────────────────────────
  // normalization
  // ────────────────────────────────────────────────────────────────────────────

  /** Phone → the externalId of its identity. The one and only normalization (was `phoneToLogin`). */
  static normalizePhone(phone: Phone | string): string {
    if (typeof phone === "string") return phone.replace(/\D/g, "");
    return `${phone?.code ?? ""}${phone?.number ?? ""}`.replace(/\D/g, "");
  }

  /**
   * A login string → its identity externalId. Today that is exactly `normalizePhone`, because
   * `phone` is the one internal provider the core owns (review3 §1.2 removed the email axis:
   * nothing in the core could deliver an email code). It stays a separate name because callers
   * mean "whatever the user typed into the login field", and a second internal provider would
   * land here rather than in every caller.
   */
  static normalizeLogin(login: string): string {
    return String(login || "").replace(/\D/g, "");
  }

  /**
   * Phone digits → { code, number }, by longest match in the country dictionary the User model
   * already ships — not by "the first digit is the country" (review1 §3). That shortcut turned
   * `380631234567` into code `"3"`, which `User.phone`'s validator rejects outright: the
   * projection did not merely come out wrong for non-Russian numbers, it failed to be written,
   * and everything keyed off `User.phone` (bonus programs, RMS) went with it.
   */
  private static phoneFromDigits(digits: string): Phone {
    // The Russian national form `8 (999) …` is the same number as `+7 (999) …` and is the one
    // shape no dictionary entry describes. Kept ahead of the lookup so that numbers already
    // stored under code "7" — including Kazakh ones, which the dictionary lists as "+77" —
    // keep projecting exactly as they do today.
    if (digits.length === 11 && (digits.startsWith("7") || digits.startsWith("8"))) {
      return { code: "7", number: digits.slice(1) };
    }
    const code = PHONE_CODES.find((c) => digits.startsWith(c));
    if (code) return { code, number: digits.slice(code.length) };
    // Nothing matched (a short or malformed number). Keep the old shape rather than inventing
    // one: the caller is storing a projection, not validating an input.
    return { code: digits.slice(0, 1) || "", number: digits.slice(1) };
  }

  /** "79995550001" → "+7 ••• ••• 50-01". Display only — never a comparison key. */
  static maskLogin(login: string): string {
    const raw = String(login || "");
    if (raw.includes("@")) {
      const [name, domain] = raw.split("@");
      const head = name.slice(0, 1);
      return `${head}${"•".repeat(Math.max(1, name.length - 1))}@${domain}`;
    }
    const digits = raw.replace(/\D/g, "");
    if (digits.length < 4) return digits;
    return `+${digits[0]} ••• ••• ${digits.slice(-4, -2)}-${digits.slice(-2)}`;
  }

  /** Mask for a non-phone identity: "@vasya" → "@va•••ya". */
  private static maskHandle(handle: string): string {
    const raw = String(handle || "");
    if (raw.length <= 4) return raw;
    return `${raw.slice(0, 2)}•••${raw.slice(-2)}`;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // secrets
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * CSPRNG only (design2 Д10 — the inherited generator was Math.random()). DEFAULT_OTP stays as
   * an escape hatch for stands and tests, and is refused in production so it cannot be turned on
   * by an env var on a live box.
   *
   * DEMO_MODE cannot get the same NODE_ENV guard: it exists specifically for Apple App Review's
   * demo sign-in, which runs against production. Instead its fixed code is scoped to an explicit
   * allowlist (AUTH_DEMO_PHONES) — every `target` not on it gets a real code even with
   * DEMO_MODE=true, so the env var stops being "log in as anyone" and becomes "log in as the one
   * reviewer number an operator configured" (review1 §2).
   */
  private static async generateSecret(length: number, target?: string): Promise<string> {
    if ((process.env.DEMO_MODE || "").toLowerCase() === "true" && (await this.isDemoTarget(target))) return "9".repeat(length);
    if (process.env.NODE_ENV !== "production" && process.env.DEFAULT_OTP) return process.env.DEFAULT_OTP;

    let out = "";
    for (let i = 0; i < length; i++) out += String(crypto.randomInt(0, 10));
    return out;
  }

  /** Is `target` on the operator-configured DEMO_MODE allowlist? Empty allowlist = nobody. */
  private static async isDemoTarget(target: string | undefined): Promise<boolean> {
    if (!target) return false;
    const list = String((await Settings.get("AUTH_DEMO_PHONES")) || "")
      .split(",")
      .map((s) => s.replace(/\D/g, ""))
      .filter(Boolean);
    return list.includes(this.normalizeLogin(target));
  }

  private static generateTicket(): string {
    return crypto.randomBytes(32).toString("hex");
  }

  /** Constant-time compare so a wrong code cannot be narrowed down by response timing. */
  private static secretMatches(expected: string | undefined, given: string): boolean {
    if (!expected) return false;
    const a = Buffer.from(String(expected));
    const b = Buffer.from(String(given ?? ""));
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  }

  /**
   * Derive a flash-call code from the number that will call, per the adapter's spec. The spec is
   * not "the tail": providers use last 4, last 6, and middle 4 (+7 495 **1234** 567), and a
   * frontend that assembles the sentence itself would need a release per provider (design2 §5).
   */
  private static extractSecret(callerNumber: string, extract: { anchor: "head" | "tail"; offset: number; length: number }): string {
    const digits = String(callerNumber || "").replace(/\D/g, "");
    if (extract.anchor === "head") return digits.slice(extract.offset, extract.offset + extract.length);
    const end = digits.length - extract.offset;
    return digits.slice(Math.max(0, end - extract.length), end);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // registry
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * `customData` is declared "json", but Waterline hands it back as a string. Spreading that
   * directly scatters it one character per key, and every read of it then silently misses —
   * which is exactly the bug the MAX adapter carries a comment about (gfcafe dev, 2026-08-20).
   * Every read in this class goes through here.
   */
  private static customData(attempt: AuthAttemptRecord | undefined): Record<string, any> {
    const raw = attempt?.customData as unknown;
    if (!raw) return {};
    if (typeof raw === "object") return raw as Record<string, any>;
    try {
      const parsed = JSON.parse(String(raw));
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  private static rowKey(row: AuthMethodRecord): string {
    return `${row.adapter}:${row.offer}`;
  }

  /**
   * Resolve "telegram:identity" / "smsc:sms" / a bare "telegram" into a live registry row.
   * A bare slug is accepted only while it is unambiguous — an adapter offering both sms and
   * flashcall must be addressed precisely, or "resend by another method" would silently pick one.
   */
  private static async resolveMethod(method: string, purpose: string, ctx: { salesChannel?: string; country?: string }): Promise<AuthMethodRecord | undefined> {
    const [adapter, offer] = String(method || "").split(":");
    const rows = await AuthMethod.getForPurpose(purpose, { salesChannel: ctx.salesChannel, country: ctx.country, includeVerifyingIdentities: true });
    const candidates = rows.filter((r) => r.adapter === adapter && (!offer || r.offer === offer));
    if (candidates.length !== 1) return undefined;
    return candidates[0];
  }

  /**
   * Verification methods usable for `login`: every phone_proof row, plus identity rows that
   * prove the number themselves (`canVerifyPhone`). One row, both lists — no bridge between two
   * registries (design2 §4.1). `supports()` is asked last because it may cost money.
   */
  static async proofMethodsFor(login: string | undefined, purpose: string, ctx: { salesChannel?: string; country?: string; deviceId?: string }): Promise<AuthMethodRecord[]> {
    const rows = await AuthMethod.getForPurpose(purpose, {
      kind: "phone_proof",
      salesChannel: ctx.salesChannel,
      country: ctx.country,
      includeVerifyingIdentities: true,
    });
    if (!login) return rows;

    const usable: AuthMethodRecord[] = [];
    for (const row of rows) {
      const adapter = AuthMethod.getAdapter(row.adapter, row.offer);
      if (!adapter) continue;
      if (typeof adapter.supports === "function") {
        try {
          const offer = adapter.offers.find((o) => o.offer === row.offer);
          if (offer && !(await adapter.supports(offer, login, { deviceId: ctx.deviceId ?? "", attemptId: "", target: login, salesChannel: ctx.salesChannel, country: ctx.country }))) {
            continue;
          }
        } catch (e) {
          sails.log.warn(`AuthService > supports() failed for ${this.rowKey(row)}`, e);
          continue;
        }
      }
      usable.push(row);
    }
    return usable;
  }

  static async identityMethodsFor(purpose: string, ctx: { salesChannel?: string; country?: string }): Promise<AuthMethodRecord[]> {
    return await AuthMethod.getForPurpose(purpose, { kind: "identity", salesChannel: ctx.salesChannel, country: ctx.country });
  }

  /**
   * Is there any way in at all — one enabled, healthy method for `login`, of either kind. The
   * client asks the same through `authMethods.phoneLoginAvailable`; this is the server-side
   * form, for the policies that only make sense while somebody can actually sign in.
   */
  static async loginAvailable(ctx: { salesChannel?: string; country?: string } = {}): Promise<boolean> {
    if ((await this.identityMethodsFor("login", ctx)).length > 0) return true;
    return (await this.proofMethodsFor(undefined, "login", ctx)).length > 0;
  }

  /**
   * REQUIRE_AUTH_FOR_CART as it actually applies. The switch demands a login before the first
   * dish; while no sign-in method is enabled that demand cannot be met, and a cart nobody can
   * start is not "protected", it is a closed shop. So the flag is read together with the
   * registry: set but unreachable → ignored (warned, at most once a minute per process). Every
   * reader — Order.addDish/doCart, getNewCart, restrictions.requireAuthForCart — comes through
   * here, so the core and the client never disagree about it (require-auth-for-cart.md §3.5).
   */
  static async cartRequiresAuth(): Promise<boolean> {
    if (!(await Settings.get("REQUIRE_AUTH_FOR_CART"))) return false;
    if (await this.loginAvailable()) return true;
    if (Date.now() - CART_FLAG_WARNED_AT >= REFUSAL_WARN_INTERVAL_MS) {
      CART_FLAG_WARNED_AT = Date.now();
      sails.log.warn("AuthService > REQUIRE_AUTH_FOR_CART is set, but no sign-in method is enabled — the flag is ignored until one is");
    }
    return false;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // attempt lifecycle
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Begin an attempt. The caller says what it wants proven (`purpose`) and, optionally, how
   * (`method`) and of what (`login`); everything else — which provider, which screen, whether a
   * message goes out at all — is decided here and reported back as `step` (И5).
   */
  static async start(input: StartInput): Promise<AuthAttemptRecord> {
    if (!input.deviceId) throw `deviceId is required to start an auth attempt`;
    if (!input.purpose) throw `purpose is required to start an auth attempt`;

    const incumbentBound = INCUMBENT_BOUND_PURPOSES.includes(String(input.purpose));
    // For a step-up the login is not the client's to choose (review2 §1.2). `undefined` here
    // means "this account has no number on record, but it does have another proven way in" —
    // then the only route left is that identity itself, checked twice below.
    const target = incumbentBound
      ? await this.incumbentTarget(input.user)
      : input.login ? this.normalizeLogin(input.login) : undefined;

    // A named method is the client's own choice and is not substituted for another; without one
    // this is the phone path and the whole chain is on the table (applyFirstUsable).
    const rows = input.method
      ? [await this.resolveMethod(input.method, input.purpose, input)].filter(Boolean) as AuthMethodRecord[]
      : await this.proofMethodsFor(target, input.purpose, input);
    const row = rows[0];
    if (!row) throw AUTH_FAIL.noMethod;

    // A phone_proof row with no target would publish `enter_phone` — the very screen that asks
    // the attacker which number to prove. A social-only account proves itself through its own
    // identity or not at all.
    if (incumbentBound && !target && row.kind !== "identity") throw AUTH_FAIL.noIncumbent;

    // A second attempt from the same device for the same purpose replaces the first: otherwise a
    // user who opened MAX twice leaves the first attempt spinning "open MAX" until its TTL and
    // never sees "expired" (design2 Д15).
    const superseded = await AuthAttempt.update(
      { deviceId: input.deviceId, purpose: input.purpose, status: ["started", "awaiting_user"] } as any,
      { status: "superseded" }
    ).fetch();
    // A superseded dial-in still holds its leased number at the provider until somebody says
    // otherwise — and nobody is going to answer that step now (design2 §10.5).
    for (const old of superseded) await this.releaseProviderLease(old);

    // Hygiene, deliberately after the supersede above: a device restarting the same screen is
    // taking its own slot back, and checking first would make it collide with its own tail.
    // What this bounds is the number of DIFFERENT unfinished purposes one device holds — free
    // attempts on the path without a login (no captcha there yet, review1 §1.3) and dial-in
    // numbers leased by simply starting. A device id comes from the client, so this is not a
    // defence and is not counted on as one (send-caps.md §1.3).
    const maxLive = Number((await Settings.get("AUTH_MAX_LIVE_ATTEMPTS_PER_DEVICE")) || 0);
    if (maxLive) {
      const live = await AuthAttempt.count({
        deviceId: input.deviceId,
        status: ["started", "awaiting_user"],
        expiresAt: { ">": Date.now() },
      } as any);
      if (live >= maxLive) {
        this.refused("live_attempts");
        // Thrown, not reported as a failReason: there is no attempt to write a reason on yet —
        // the same shape AUTH_FAIL.noMethod has a few lines above.
        throw AUTH_FAIL.rateLimited;
      }
    }

    const ttl = await AuthAttempt.ttlMs();
    const attempt = await AuthAttempt.create({
      purpose: input.purpose,
      deviceId: input.deviceId,
      user: input.user,
      methodAdapter: row.adapter,
      methodOffer: row.offer,
      target,
      status: "started",
      expiresAt: Date.now() + ttl,
      customData: {
        ...(input.salesChannel ? { salesChannel: input.salesChannel } : {}),
        ...(input.country ? { country: input.country } : {}),
        ...(input.locale ? { locale: input.locale } : {}),
        ...(input.redirectBack ? { redirectBack: input.redirectBack } : {}),
      },
    }).fetch();

    // The user typed this number themselves, so they are already looking at the code form —
    // send straight away. A target that arrives later from a provider profile is delivered
    // lazily instead (see beginPhoneProof).
    return await this.applyFirstUsable(attempt, rows, { deliverNow: Boolean(target) });
  }

  /**
   * Put `row` in charge of `attempt` and rebuild the step for it. Called by start(), authSwitch()
   * and the invisible waterfall — one place, so "changing the method regenerates the step and
   * kills the secret" (И7) holds by construction rather than by remembering to do it.
   *
   * The answer says whether the row is actually in charge now. It has to be said out loud rather
   * than guessed at by comparing `methodAdapter`/`methodOffer` afterwards: a spend refused inside
   * beginProofStep leaves the attempt untouched, and a caller that reads the row back off it
   * cannot tell "refused" from "was already this method" (review3 §1.7).
   */
  private static async applyMethod(attempt: AuthAttemptRecord, row: AuthMethodRecord, opts: ApplyOpts = {}): Promise<ApplyResult> {
    const adapter = AuthMethod.getAdapter(row.adapter, row.offer);
    if (!adapter) throw AUTH_FAIL.noMethod;
    const offer = adapter.offers.find((o) => o.offer === row.offer);
    if (!offer) throw AUTH_FAIL.noMethod;

    const patch: Partial<AuthAttemptRecord> = {
      methodAdapter: row.adapter,
      methodOffer: row.offer,
      // New step ⇒ any secret issued for the previous one has nothing left to match against.
      secret: null,
      secretExpiresAt: null,
      callerNumber: null,
      sentAt: null,
      // …and neither has the previous provider's reference: a DNIS left over from a dial-in step
      // would be "released" a second time by the expiry sweep, and would keep pointing an ANI
      // lookup at a step that no longer exists.
      providerRef: null,
      status: "awaiting_user",
      failReason: null,
    };

    if (offer.kind === "identity") {
      const started = await adapter.start({ ...attempt, ...patch } as AuthAttemptRecord, offer);
      patch.providerRef = started.providerRef ?? attempt.providerRef;
      patch.step = this.buildStep(started.redirectUrl ? "redirect" : "provider_dialog", {
        redirectUrl: started.redirectUrl,
        clientPayload: started.clientPayload,
        hint: row.hintKey,
        expiresInSeconds: started.ttlSec,
      });
    } else if (!attempt.target) {
      // The provider gave us no number (or none was typed yet) — ask for it before spending
      // anything at a provider. Whoever answers this step picks the number the next SMS is aimed
      // at, so it carries the same captcha gate authStart(login:) does — otherwise starting
      // without a login is a free way round it (review1 §1.3).
      patch.step = this.buildStep("enter_phone", { hint: row.hintKey, captchaRequired: true });
    } else {
      const proof = await this.beginProofStep({ ...attempt, ...patch } as AuthAttemptRecord, row, adapter, offer, opts);
      // The step could not be built because building it costs money and the budget said no.
      // Nothing of `patch` is written: the attempt keeps the method and the screen it had, and
      // the caller decides what to put there instead (applyFirstUsable).
      if ("refused" in proof) {
        const refused = await AuthAttempt.updateOne({ id: attempt.id }, { failReason: proof.refused });
        return { attempt: refused, applied: false, reason: proof.refused };
      }
      Object.assign(patch, proof);
    }

    // stepType is the flat copy the CAS in claimAndSend keys on — it cannot look inside JSON,
    // so the two must never be written apart.
    if (patch.step) patch.stepType = patch.step.type;
    const updated = await AuthAttempt.updateOne({ id: attempt.id }, patch as any);

    if (opts.deliverNow && updated.stepType === "enter_code") {
      // A budget refusal here is not a refusal to apply: the step exists, it is on screen, and
      // `failReason: rate_limited` plus the countdown tell the user when to press again.
      return { attempt: await this.claimAndSend(updated.id as string, { bypassInterval: opts.bypassInterval }), applied: true };
    }
    return { attempt: updated, applied: true };
  }

  /**
   * Apply the first row of `rows` that can actually take charge, and never leave the attempt
   * without a screen (review3 §5.4).
   *
   * A provider-owned row is a special kind of trouble: its step is BORN of the spend
   * (`adapter.start()` places the flash-call), so "build the step anyway and refuse the send"
   * is not a thing that exists for it. The rule is therefore: a paid step gives way to a free
   * one. If the budget refuses the operator's first choice and the same chain holds a
   * server-owned row, that row is applied instead — its `enter_code` costs nothing to draw, and
   * the very same refusal will meet it inside claimAndSend, which is the state an SMS-first
   * installation has always ended in: a live form, `sentAt: null`, `rate_limited`, a countdown.
   *
   * Once only, and only onto a server row: every cap but the pause is indifferent to which row
   * asks, so walking the whole chain would buy N identical refusals at N sets of queries.
   */
  private static async applyFirstUsable(attempt: AuthAttemptRecord, rows: AuthMethodRecord[], opts: ApplyOpts = {}): Promise<AuthAttemptRecord> {
    const row = rows[0];
    if (!row) throw AUTH_FAIL.noMethod;

    const first = await this.applyMethod(attempt, row, opts);
    if (first.applied) return first.attempt;

    const free = rows.find((r) => r !== row && this.isServerSecret(r));
    if (free) return (await this.applyMethod(first.attempt, free, opts)).attempt;

    // Nothing free to fall back on (a flash-call-only installation). There is no honest screen
    // to draw, so the attempt ends here and says why; view() keeps the countdown alive so the
    // client knows when authStart is worth calling again.
    return await AuthAttempt.updateOne({ id: attempt.id }, { status: "failed", failReason: first.reason });
  }

  /** Does this row's step cost nothing to build — i.e. is the code ours to invent? */
  private static isServerSecret(row: AuthMethodRecord): boolean {
    const offer = AuthMethod.getAdapter(row.adapter, row.offer)?.offers.find((o) => o.offer === row.offer);
    return Boolean(offer && offer.kind === "phone_proof" && offer.secretOrigin === "server");
  }

  /** Build the phone_proof step: what to show, how long the field is, and who owns the secret. */
  private static async beginProofStep(attempt: AuthAttemptRecord, row: AuthMethodRecord, adapter: AuthAdapter, offer: Offer & { kind: "phone_proof" }, opts: ApplyOpts = {}): Promise<Partial<AuthAttemptRecord> | { refused: string }> {
    const ttlSec = Number(row.ttlSec || (await Settings.get("OTP_TTL_SECONDS")) || 1800);

    if (offer.secretOrigin === "server") {
      // We invent the code now, but nothing is delivered until the sentAt CAS is won.
      const length = Number(row.codeLength || offer.codeLength || 6);
      return {
        secret: await this.generateSecret(length, attempt.target as string),
        secretExpiresAt: Date.now() + ttlSec * 1000,
        step: this.buildStep("enter_code", { codeLength: length, hint: row.hintKey, expiresInSeconds: ttlSec }),
      };
    }

    // provider / none: the adapter has to act before we know what to draw. Acting IS the spend
    // (the flash-call is placed, the dial-in line is reserved), so it goes through spend() — the
    // one door everything that costs money uses, ledger and rollback included.
    const spent = await this.spend(attempt, row, opts.kind ?? "send", opts, () => adapter.start(attempt, offer));
    if (spent.reason) return { refused: spent.reason };
    const started = spent.value;

    if (offer.mode === "dial_number") {
      return {
        providerRef: started.providerRef,
        // Dial-in has no field at all: the proof is the call itself arriving with the right ANI.
        step: this.buildStep("dial_number", { dialNumber: started.dialNumber, hint: row.hintKey, expiresInSeconds: started.ttlSec ?? ttlSec }),
      };
    }

    if (offer.mode === "await_signal") {
      return {
        providerRef: started.providerRef,
        step: this.buildStep("await_signal", { hint: row.hintKey, expiresInSeconds: started.ttlSec ?? ttlSec }),
      };
    }

    // enter_code with a provider-owned secret — flash-call. The caller number stays server-side
    // forever (И1/§10.1): handing it to the client turns the check into arithmetic.
    let secret: string | undefined = started.expectedSecret;
    if (!secret && started.callerNumber && started.extract) {
      secret = this.extractSecret(started.callerNumber, started.extract);
    }
    const length = Number(secret ? secret.length : started.extract?.length || row.codeLength || offer.codeLength || 4);

    return {
      providerRef: started.providerRef,
      callerNumber: started.callerNumber,
      secret,
      secretExpiresAt: Date.now() + (started.ttlSec ?? ttlSec) * 1000,
      customData: { ...this.customData(attempt), ...(started.extract ? { extract: JSON.stringify(started.extract) } : {}) },
      // `deferred`: the number is still on its way by webhook — show a spinner, not an empty field.
      step: started.deferred
        ? this.buildStep("await_signal", { hint: row.hintKey, expiresInSeconds: started.ttlSec ?? ttlSec })
        : this.buildStep("enter_code", { codeLength: length, hint: row.hintKey, expiresInSeconds: started.ttlSec ?? ttlSec }),
      // Flash-call and dial-in are not messages, so nothing is ever "sent" for them: marking the
      // CAS as already claimed keeps authResend from trying (design2 §7.4).
      sentAt: Date.now(),
    };
  }

  private static buildStep(type: StepType, fields: Partial<AuthStep> = {}): AuthStep {
    return {
      // A fresh uuid per step is the whole of И7: a submit carrying yesterday's id gets
      // "refresh the screen", not "wrong code".
      id: uuid(),
      type,
      ...fields,
    };
  }

  /**
   * Claim the right to send, then send. The trigger is client-side and clients come in
   * multiples (two tabs, a re-mount, a retry), so the "not sent yet" test has to live inside the
   * same conditional update as the write — a read-then-send fans out SMS (И8).
   *
   * `target IS NOT NULL` is part of the same condition on purpose: the form can be rendered
   * before the provider callback lands, and the state changes between reading and acting.
   */
  static async claimAndSend(attemptId: string, opts: { bypassInterval?: boolean } = {}): Promise<AuthAttemptRecord> {
    const claimed = await AuthAttempt.update(
      { id: attemptId, stepType: "enter_code", target: { "!=": null }, sentAt: null, status: "awaiting_user" } as any,
      { sentAt: Date.now() }
    ).fetch();
    if (!claimed.length) {
      // Too early, already sent, or not a code step at all — every one of those is a no-op.
      return (await AuthAttempt.findOne({ id: attemptId })) as AuthAttemptRecord;
    }

    const attempt = claimed[0];
    try {
      const spent = await this.spend(attempt, null, "send", opts, () => this.dispatch(attempt));
      if (spent.reason) {
        await AuthAttempt.updateOne({ id: attemptId }, { sentAt: null, failReason: spent.reason });
        return (await AuthAttempt.findOne({ id: attemptId })) as AuthAttemptRecord;
      }
    } catch (e) {
      // sentAt is written BEFORE the send, so an exception has to roll it back or the attempt
      // sticks forever at "code sent" with no code anywhere (И8, Д13). The ledger entry has
      // already gone back inside spend() — this claim is the part that belongs to claimAndSend.
      await AuthAttempt.updateOne({ id: attemptId }, { sentAt: null, failReason: AUTH_FAIL.sendFailed });
      sails.log.error(`AuthService.claimAndSend [${attemptId}]`, e);
      return (await AuthAttempt.findOne({ id: attemptId })) as AuthAttemptRecord;
    }

    // The user is about to leave for their SMS app and come back; the attempt TTL is shorter
    // than the code TTL.
    await AuthAttempt.extendTtl(attemptId);
    await this.notifySideChannel(attempt);
    return (await AuthAttempt.findOne({ id: attemptId })) as AuthAttemptRecord;
  }

  /**
   * Hand the attempt to its adapter, falling through the registry rows that share the offer
   * when one fails. This is the waterfall INSIDE a method (design2 §7.3): the user never sees
   * it, they only see the screen redraw — which is exactly why the redraw is mandatory (И5),
   * since the next provider may want a different number of digits.
   */
  private static async dispatch(attempt: AuthAttemptRecord): Promise<void> {
    const purpose = attempt.purpose as string;
    const custom = this.customData(attempt);
    const chain = (await this.proofMethodsFor(attempt.target as string, purpose, { salesChannel: custom.salesChannel, country: custom.country, deviceId: attempt.deviceId }))
      .filter((r) => r.offer === attempt.methodOffer);

    // Current row first, then the rest of the same offer in operator order.
    const ordered = [
      ...chain.filter((r) => r.adapter === attempt.methodAdapter),
      ...chain.filter((r) => r.adapter !== attempt.methodAdapter),
    ];

    let lastError: unknown;
    for (const row of ordered) {
      const adapter = AuthMethod.getAdapter(row.adapter, row.offer);
      const offer = adapter?.offers.find((o) => o.offer === row.offer);
      if (!adapter || !offer) continue;
      try {
        await adapter.start(attempt, offer);
        if (row.adapter !== attempt.methodAdapter) {
          await AuthAttempt.updateOne({ id: attempt.id }, { methodAdapter: row.adapter });
        }
        return;
      } catch (e) {
        lastError = e;
        sails.log.warn(`AuthService > provider [${this.rowKey(row)}] failed, trying next`, e);
      }
    }
    throw lastError ?? AUTH_FAIL.noMethod;
  }

  /**
   * Antiflood, keyed by the login and NOT by the attempt (И6). One live secret per attempt is
   * what makes two tabs work; without a per-target cap it is also what would give an attacker N
   * budgets and N SMS by starting N attempts.
   *
   * The history is read from AuthSendLog and never from the attempt: `sentAt` is nulled by every
   * `applyMethod`, so a budget computed from it was reset by the user's own authSwitch — an
   * unmetered SMS pump aimed at somebody else's number (review1 §1.2). Three windows, one
   * source: the pause between two codes, and the caps that make "1 per minute, forever" finite.
   */
  private static async checkSendBudget(target: string, opts: { bypassInterval?: boolean; row?: AuthMethodRecord | null } = {}): Promise<string | null> {
    if (!target) return null;

    // Geography first: it is a string comparison, it needs no query, and it is the one refusal
    // that must happen before anything is written down (send-caps.md §1.2).
    if (!(await this.isTargetCountryAllowed(target))) {
      this.refused("country");
      return AUTH_FAIL.countryNotAllowed;
    }

    // The pause is the only part a switch may skip: "the call never came, send me an SMS" is the
    // reason authSwitch exists, and making the user wait a minute for it would push them back to
    // authStart anyway. The caps below are NOT skippable — they are what makes the switch path
    // finite (bounded further by AUTH_MAX_SWITCHES).
    if (!opts.bypassInterval) {
      const intervalSec = await this.resendIntervalSec(opts.row);
      const last = await AuthSendLog.lastAt(target);
      if (last && Date.now() - last < intervalSec * 1000) {
        this.refused("interval");
        return AUTH_FAIL.rateLimited;
      }
    }

    const perHour = Number((await Settings.get("AUTH_SEND_MAX_PER_TARGET_HOUR")) || 0);
    if (perHour && (await AuthSendLog.countSince(target, Date.now() - 60 * 60 * 1000)) >= perHour) {
      this.refused("target_hour");
      return AUTH_FAIL.rateLimited;
    }

    const perDay = Number((await Settings.get("AUTH_SEND_MAX_PER_TARGET_DAY")) || 0);
    if (perDay && (await AuthSendLog.countSince(target, Date.now() - 24 * 60 * 60 * 1000)) >= perDay) {
      this.refused("target_day");
      return AUTH_FAIL.rateLimited;
    }

    // Over ALL targets and every source. The caps above bound what one number receives; nothing
    // in them bounds the bill when the numbers are all different and the senders are a pool of
    // proxies. A source is not a boundary — a device id is the client's to rotate and an IP is
    // a proxy away — so the boundary is the ledger total (send-caps.md §0, §1.1).
    //
    // `bypassInterval` does not reach this either: a switch may skip the pause, never a cap.
    // The client is told plain `rate_limited`, the same as for a per-target cap: which ceiling
    // was touched is more use to an attacker than to a user, so that axis goes to the log and
    // the metric instead.
    const globalHour = Number((await Settings.get("AUTH_SEND_MAX_GLOBAL_HOUR")) || 0);
    if (globalHour && (await AuthSendLog.countAllSince(Date.now() - 60 * 60 * 1000)) >= globalHour) {
      this.refused("global_hour");
      return AUTH_FAIL.rateLimited;
    }

    return null;
  }

  /**
   * The calling codes an ISO allowlist stands for, memoised by the setting's own value. Built
   * from the very dictionary `phoneFromDigits` splits by, so "allowed" and "how the number will
   * be stored" can never disagree.
   */
  private static allowedCallingCodes(allowed: string[]): string[] {
    const key = allowed.join(",");
    if (COUNTRY_CODES_MEMO.key !== key) {
      const wanted = new Set(allowed.map((iso) => String(iso || "").trim().toUpperCase()));
      COUNTRY_CODES_MEMO.codes = Array.from(
        new Set(COUNTRIES.filter((c) => wanted.has(String(c.iso).toUpperCase())).map((c) => String(c.phoneCode).replace(/\D/g, "")))
      ).filter(Boolean);
      COUNTRY_CODES_MEMO.key = key;
    }
    return COUNTRY_CODES_MEMO.codes;
  }

  /**
   * The allowlist an operator actually gets, as opposed to the one they typed. An operator who
   * never touches `AUTH_SEND_ALLOWED_COUNTRIES` is indistinguishable, at the Settings layer, from
   * one who explicitly chose "everywhere" — both read back as `[]` (review1 §5: "300 is a stub,
   * not a recommendation" applied here too). Defaulting the unconfigured case to "everywhere" is
   * how an install goes live open to IRSF from every calling code on day one; defaulting it to the
   * project's own `COUNTRY_ISO` — which SetupChecklist already makes required — costs nothing an
   * operator selling only at home was going to want anyway, and an operator who does serve other
   * countries sets the list once and this fallback never runs again.
   */
  private static async effectiveAllowedCountries(): Promise<string[]> {
    const configured = (await Settings.get("AUTH_SEND_ALLOWED_COUNTRIES")) as string[] | undefined;
    if (Array.isArray(configured) && configured.length) return configured;
    const projectCountry = await Settings.get("COUNTRY_ISO");
    // COUNTRY_ISO itself missing means setup has not run at all (or a test fixture with neither
    // set) — "everywhere" is the only honest answer left, same as before this fallback existed.
    return projectCountry ? [String(projectCountry)] : [];
  }

  /**
   * May we spend anything at all on this target?
   *
   * The point is IRSF: a premium range in a country the restaurant does not serve is how an OTP
   * form is turned into somebody else's revenue, and it is the one attack that pays for itself
   * whatever the sender's IP is (send-caps.md §1.2).
   *
   * Matched by calling-code prefix rather than by the split `phoneFromDigits` produces, because
   * that split answers a different question: an 11-digit number starting with 7 or 8 is code "7"
   * to it, which is right for storage and wrong here — a Kazakh number would then fail an
   * allowlist that names KZ. Note the converse still holds and is intended: +7 is one calling
   * code for two countries, so allowing RU allows KZ. Both are one tariff, and the setting says so.
   */
  private static async isTargetCountryAllowed(target: string): Promise<boolean> {
    const allowed = await this.effectiveAllowedCountries();
    if (!allowed.length) return true;

    const digits = String(target || "").replace(/\D/g, "");
    // The Russian national form is the same number written differently, exactly as in phoneFromDigits.
    const normalized = digits.length === 11 && digits.startsWith("8") ? `7${digits.slice(1)}` : digits;
    return this.allowedCallingCodes(allowed).some((code) => normalized.startsWith(code));
  }

  /**
   * A cap said no. One place, because a refusal has to be visible somewhere that survives the
   * request: the client is deliberately told less than the truth (`rate_limited` for four
   * different ceilings), so the operator's only view of which one fired is here.
   *
   * Not a Notification: reacting to a ceiling is monitoring's job, and a notification channel
   * under an attack becomes the noise it was meant to report (send-caps.md §0).
   */
  private static refused(reason: AuthSendRefusal): void {
    try {
      void getEmitter()
        .emit("core:auth-send-refused", { reason })
        .catch((): void => undefined);
    } catch {
      // No emitter yet (very early boot, or a worker outside sails) — a metric is not worth an
      // exception on the refusal path.
    }

    try {
      // Only the two that mean "something is happening to the whole installation" are worth a
      // warn, and even those at most once a minute per process.
      if (reason === "global_hour" || reason === "country") {
        const last = REFUSAL_WARNED_AT.get(reason) || 0;
        if (Date.now() - last >= REFUSAL_WARN_INTERVAL_MS) {
          REFUSAL_WARNED_AT.set(reason, Date.now());
          sails.log.warn(`AuthService > send refused by the [${reason}] cap (further refusals are counted, not logged for a minute)`);
          return;
        }
      }
      sails.log.debug(`AuthService > send refused by the [${reason}] cap`);
    } catch {
      // sails.log is not there in a bare unit context; the emit above already happened.
    }
  }

  /**
   * How long this method wants the target to rest between two sends. Per-row override with the
   * global default underneath — the same rule as `ttlSec`, because `resendAfterSec` is edited in
   * the very same admin form (bind.ts) and a control the code never reads is a lie told to the
   * operator (review1 §4). A flash-call that costs a fraction of an SMS may legitimately want a
   * shorter pause than the SMS row standing next to it.
   *
   * `0`/`null` means "inherit"; the row cannot opt out of the pause entirely, since the caps in
   * checkSendBudget are what bound the target's spend and the interval is what paces it.
   */
  private static async resendIntervalSec(row?: AuthMethodRecord | null): Promise<number> {
    return Number(row?.resendAfterSec || (await Settings.get("OTP_RESEND_INTERVAL_SECONDS")) || 60);
  }

  /**
   * One spend. Check the budget → write it in the ledger → do the thing → give the ledger entry
   * back if the thing threw.
   *
   * Everything that costs money goes through here and nowhere else — the SMS pipeline, the
   * flash-call, the leased dial-in number — which is what keeps "how much was spent" and "what
   * actually happened" from drifting apart. Before this there were two paths with two answers to
   * each of those questions (review3 §1.7).
   *
   * The order — ledger first, action second — is deliberate and must not be flipped: a provider
   * call that fails after the money left has to have been written down, or a broken gateway
   * becomes a free channel for whoever is pointing it at somebody else's number.
   */
  private static async spend<T>(
    attempt: AuthAttemptRecord,
    row: AuthMethodRecord | null,
    kind: "send" | "resend",
    opts: { bypassInterval?: boolean },
    act: () => Promise<T>
  ): Promise<{ reason: string | null; value?: T }> {
    const target = attempt.target as string;
    // The row is what the pause is asked of: `resendAfterSec` is a per-method override.
    const methodRow = row ?? (await AuthMethod.getBySlugOffer(attempt.methodAdapter as string, attempt.methodOffer as string));
    const reason = await this.checkSendBudget(target, { bypassInterval: opts.bypassInterval, row: methodRow });
    if (reason) return { reason };

    const logRow = await AuthSendLog.record({
      target,
      attempt: attempt.id as string,
      deviceId: attempt.deviceId,
      adapter: (methodRow?.adapter ?? attempt.methodAdapter) as string,
      offer: (methodRow?.offer ?? attempt.methodOffer) as string,
      kind,
    });

    // The denominator for the refusal counter: "how many were refused" says nothing without
    // "out of how many". Method only — who it went to stays in the ledger (send-caps.md §2).
    try {
      void getEmitter()
        .emit("core:auth-send", {
          adapter: String(methodRow?.adapter ?? attempt.methodAdapter ?? ""),
          offer: String(methodRow?.offer ?? attempt.methodOffer ?? ""),
        })
        .catch((): void => undefined);
    } catch {
      // See refused(): a metric never breaks a send.
    }

    try {
      return { reason: null, value: await act() };
    } catch (e) {
      // Nothing left the building, so nothing was spent. The ledger is the only thing rolled
      // back here — whatever else the caller claimed (the sentAt CAS) is the caller's to undo.
      await this.releaseSend(logRow.id as string);
      throw e;
    }
  }

  /** Give a ledger entry back. Called from spend() and nowhere else. */
  private static async releaseSend(logId: string | undefined): Promise<void> {
    if (!logId) return;
    try {
      await AuthSendLog.destroy({ id: logId });
    } catch (e) {
      sails.log.warn(`AuthService.releaseSend [${logId}]`, e);
    }
  }

  /**
   * Seconds until this target may be spent on again — the client's countdown (И6). Same interval
   * the next send will actually be judged by, per-row included, or the button would come back
   * alive a minute before the budget does.
   */
  private static async nextSendAfterSeconds(attempt: AuthAttemptRecord): Promise<number> {
    const target = attempt.target as string;
    if (!target) return 0;
    const last = await AuthSendLog.lastAt(target);
    const rateLimited = attempt.failReason === AUTH_FAIL.rateLimited;
    // Nothing was ever sent to this target and nothing was refused: no row lookup, no countdown.
    // Keeps the poll (which lands here every second or two) down to the one query it already made.
    if (!last && !rateLimited) return 0;

    const row = attempt.methodAdapter
      ? await AuthMethod.getBySlugOffer(attempt.methodAdapter as string, attempt.methodOffer as string)
      : null;
    const intervalSec = await this.resendIntervalSec(row);
    const left = last ? Math.max(0, intervalSec - Math.floor((Date.now() - last) / 1000)) : 0;

    // The target's own pause is over, and the last send was still refused — so it was one of the
    // caps that is not about this target (the ledger total). Returning 0 there would be a lie
    // the client acts on: a live button, a press, another refusal, a countdown that never runs
    // (send-caps.md §1.1). One interval is the honest answer, since the hourly window frees up
    // continuously; and it costs no second query, which the once-a-second poll cares about.
    if (rateLimited && left === 0) return intervalSec;
    return left;
  }

  /** "A code was just sent to +7 ••• 42-88" in the provider's own chat — never the code (И1). */
  private static async notifySideChannel(attempt: AuthAttemptRecord): Promise<void> {
    try {
      const adapter = AuthMethod.getAdapterBySlug(String(this.customData(attempt).identityAdapter ?? ""));
      if (!adapter || typeof adapter.notifySideChannel !== "function") return;
      const ttlSec = Math.max(0, Math.round((Number(attempt.secretExpiresAt || 0) - Date.now()) / 1000));
      await adapter.notifySideChannel(attempt, { hint: this.maskLogin(attempt.target as string), ttlSec });
    } catch (e) {
      sails.log.error(`AuthService.notifySideChannel [${attempt.id}]`, e);
    }
  }

  /**
   * Poll. Strictly read-only (И5) — caches, prefetch and retries all hit this — apart from the
   * expiry marking the reader owns, which is the same write for every caller (review3 §2.5).
   */
  static async status(id: string, deviceId: string): Promise<AuthAttemptRecord | undefined> {
    return await AuthAttempt.load(id, { deviceId });
  }

  /**
   * "Send it again". What that means is decided by who owns the secret, and by nothing else —
   * there is no `adapter.resend()` any more (review3 §5.2): a contract method returning
   * `boolean` had nowhere to put the new secret a second flash-call produces, so the only
   * adapter that implemented it just called its own `start()`, and everybody else was silently
   * skipped.
   *
   * | secret            | again means                                                          |
   * |-------------------|----------------------------------------------------------------------|
   * | server            | the same code in a new message — same step, so И7 is not disturbed    |
   * | provider / none   | another call, i.e. another secret, i.e. a NEW step: `applyMethod`     |
   */
  static async resend(id: string, deviceId: string): Promise<AuthAttemptRecord> {
    const attempt = await this.requireOwned(id, deviceId);
    // Any step a phone_proof publishes can be re-issued, not just `enter_code`: `dial_number`
    // and `await_signal` are re-placed by a second start(), and used to sit here as a no-op.
    if (!PROOF_STEP_TYPES.includes(attempt.stepType as StepType) || !attempt.target) return attempt;

    // First render of the form: the code has not gone out at all yet (the lazy social path).
    if (!attempt.sentAt) return await this.claimAndSend(id);

    const maxResends = Number((await Settings.get("AUTH_OTP_MAX_RESENDS")) || 3);
    if (Number(attempt.resends || 0) >= maxResends) return attempt;

    const row = await AuthMethod.getBySlugOffer(attempt.methodAdapter as string, attempt.methodOffer as string);
    const offer = row ? AuthMethod.getAdapter(row.adapter, row.offer)?.offers.find((o) => o.offer === row.offer) : undefined;
    if (!row || !offer || offer.kind !== "phone_proof") return attempt;

    if (offer.secretOrigin !== "server") {
      // A new call carries a new secret, so the step it belongs to has to be new as well — the
      // client redraws on the new `step.id`, which is И7 doing its job rather than being bent.
      // The spend (and the budget that guards it) happens inside beginProofStep.
      const again = await this.applyMethod(attempt, row, { kind: "resend" });
      if (!again.applied) return again.attempt;
      await AuthAttempt.extendTtl(id);
      return await AuthAttempt.updateOne({ id }, { resends: Number(attempt.resends || 0) + 1 });
    }

    // A dead secret has nothing to re-send: after the guess budget is spent the code is
    // destroyed on purpose, and "again" would push an empty `otp.code` through the template.
    // Server-owned only — a provider-owned secret is replaced by the new call above, so there
    // is nothing there to be locked out of (review1 §1.2).
    if (!attempt.secret || (attempt.secretExpiresAt && Number(attempt.secretExpiresAt) < Date.now())) {
      return await AuthAttempt.updateOne({ id }, { failReason: AUTH_FAIL.codeLocked });
    }

    try {
      // The interval and the per-target caps come from the same ledger as the first send, so
      // "resend" cannot be cheaper than "send" and cannot be reset by switching method first.
      const spent = await this.spend(attempt, row, "resend", {}, async () => {
        // Bump the counter BEFORE dispatching: the adapter derives the message's idempotency key
        // from it, and a resend reusing the previous key is a message the pipeline may drop as a
        // duplicate — i.e. a "resend" that sends nothing.
        await this.dispatch(await AuthAttempt.updateOne({ id }, { resends: Number(attempt.resends || 0) + 1 }));
      });
      if (spent.reason) return await AuthAttempt.updateOne({ id }, { failReason: spent.reason });
    } catch (e) {
      sails.log.error(`AuthService.resend [${id}]`, e);
      return await AuthAttempt.updateOne({ id }, { resends: Number(attempt.resends || 0), failReason: AUTH_FAIL.sendFailed });
    }

    await AuthAttempt.extendTtl(id);
    return await AuthAttempt.updateOne({ id }, { sentAt: Date.now(), failReason: null });
  }

  /**
   * Switch to another method by the user's own hand. Counters are carried over, otherwise
   * "SMS → flash-call → SMS → …" walks straight around the antiflood (design2 §7.3) — which is
   * what it did: the counter was written and never read, and the new step reset `sentAt`
   * (review1 §1.2). Three things hold the line now: a cap on how many times one attempt may be
   * re-aimed, a refusal to "switch" to the method already in charge, and a budget that lives in
   * AuthSendLog and therefore survives the switch.
   */
  static async switchMethod(id: string, deviceId: string, method: string): Promise<AuthAttemptRecord> {
    const attempt = await this.requireOwned(id, deviceId);
    const custom = this.customData(attempt);
    const row = await this.resolveMethod(method, attempt.purpose as string, { salesChannel: custom.salesChannel, country: custom.country });
    if (!row) throw AUTH_FAIL.noMethod;

    // Re-picking the current method is not a switch: honouring it would mint a fresh secret and
    // a fresh send for free, which is the whole exploit in one call.
    if (row.adapter === attempt.methodAdapter && row.offer === attempt.methodOffer) return attempt;

    const maxSwitches = Number((await Settings.get("AUTH_MAX_SWITCHES")) || 0);
    if (maxSwitches && Number(attempt.switches || 0) >= maxSwitches) {
      return await AuthAttempt.updateOne({ id }, { failReason: AUTH_FAIL.switchLimit });
    }

    // The user picked this row by hand, so applyFirstUsable is deliberately not used: falling
    // through to another method would answer a question nobody asked.
    const applied = await this.applyMethod(attempt, row, { deliverNow: Boolean(attempt.target), bypassInterval: true });

    // The switch is spent only once the attempt has actually been re-aimed. A provider-owned
    // method refused by the send budget leaves the previous method in charge, and counting that
    // used to turn three refusals into `switch_limit` without a single switch having happened
    // (review2 §2.6).
    if (!applied.applied) return applied.attempt;

    // The method that was replaced gives back what it was holding at its provider — after the
    // replacement is in charge, never before: had the switch been refused, that step would still
    // be the one on screen, with its number gone.
    await this.releaseProviderLease(attempt);
    return await AuthAttempt.updateOne({ id }, { switches: Number(attempt.switches || 0) + 1 });
  }

  /**
   * Give back whatever the provider is holding for a step that will not be answered — the leased
   * dial-in number above all (design2 §10.5: "a short lease and a mandatory cancel()"). Nothing
   * called `cancel()` at all before review2 §3, so a pool of rented numbers was burnt down by
   * attempts that were merely abandoned. Best-effort by nature: the attempt is over either way,
   * and a provider that is down must not stop it from being over.
   *
   * Keyed on `providerRef` rather than on the step type: that field is the provider's handle on
   * OUR outbound request, whatever the flow; the adapter decides what releasing it means.
   */
  private static async releaseProviderLease(attempt: AuthAttemptRecord): Promise<void> {
    if (!attempt.providerRef) return;
    const adapter = AuthMethod.getAdapter(attempt.methodAdapter as string, attempt.methodOffer as string);
    if (!adapter || typeof adapter.cancel !== "function") return;
    try {
      await adapter.cancel(attempt);
    } catch (e) {
      sails.log.warn(`AuthService > cancel() failed for [${attempt.methodAdapter}:${attempt.methodOffer}] attempt ${attempt.id}`, e);
    }
  }

  /**
   * The periodic sweep (afterHook): release what overdue attempts still hold at their providers,
   * then let AuthAttempt.cleanupExpired delete them. Leases first — the rows are what carry the
   * `providerRef`, and after the delete there is nothing left to cancel by.
   */
  static async sweepExpired(): Promise<number> {
    const overdue = await AuthAttempt.find({
      where: { status: ["started", "awaiting_user", "expired"], expiresAt: { "<": Date.now() }, providerRef: { "!=": null } } as any,
      limit: 5000,
    });
    for (const attempt of overdue) await this.releaseProviderLease(attempt);
    return await AuthAttempt.cleanupExpired();
  }

  /**
   * The one submit. What `input` means is decided by the step the server itself last published —
   * the client never chooses between "this is a phone" and "this is a code".
   */
  static async submit(id: string, stepId: string, input: string, ctx: AuthContext): Promise<AuthAttemptRecord> {
    const attempt = await this.requireOwned(id, ctx.deviceId);

    if (!attempt.step || attempt.step.id !== stepId) {
      // A form left open in a second tab while the first one changed the number. Saying "wrong
      // code" here would send the user round the same loop forever.
      return await AuthAttempt.updateOne({ id }, { failReason: AUTH_FAIL.staleStep });
    }

    if (attempt.stepType === "enter_phone") return await this.acceptTarget(attempt, input);
    if (attempt.stepType === "enter_code") return await this.acceptCode(attempt, input, ctx);
    // dial_number / await_signal / provider_dialog have no input: the signal arrives elsewhere.
    return attempt;
  }

  /** Fix the login string for an attempt and move to the proof step. */
  private static async acceptTarget(attempt: AuthAttemptRecord, input: string): Promise<AuthAttemptRecord> {
    // start() never publishes `enter_phone` for a step-up, and it must stay that way even if a
    // future waterfall builds a step from somewhere else: a client-named number here would be
    // the same self-issued step-up the purpose rule exists to stop (review2 §1.2).
    if (INCUMBENT_BOUND_PURPOSES.includes(String(attempt.purpose))) throw AUTH_FAIL.noIncumbent;

    const target = this.normalizeLogin(input);
    if (!target) throw `A login is required`;

    // Write-once per step, and claimed conditionally: one finished social login must not become
    // a licence to aim codes at an unlimited number of victims.
    const claimed = await AuthAttempt.update({ id: attempt.id, target: null } as any, { target }).fetch();
    if (!claimed.length) return (await AuthAttempt.findOne({ id: attempt.id })) as AuthAttemptRecord;

    const custom = this.customData(attempt);
    const usable = await this.proofMethodsFor(target, attempt.purpose as string, { salesChannel: custom.salesChannel, country: custom.country, deviceId: attempt.deviceId });

    const reloaded = (await AuthAttempt.findOne({ id: attempt.id })) as AuthAttemptRecord;
    return await this.applyFirstUsable(reloaded, usable, { deliverNow: true });
  }

  /** Check a submitted code and, if it is right, finish the attempt. */
  private static async acceptCode(attempt: AuthAttemptRecord, input: string, ctx: AuthContext): Promise<AuthAttemptRecord> {
    if (!attempt.secret) {
      return await AuthAttempt.updateOne({ id: attempt.id }, { failReason: AUTH_FAIL.codeLocked });
    }
    if (attempt.secretExpiresAt && Number(attempt.secretExpiresAt) < Date.now()) {
      return await AuthAttempt.updateOne({ id: attempt.id }, { secret: null, failReason: AUTH_FAIL.expired });
    }

    if (!this.secretMatches(attempt.secret as string, input)) {
      // CAS on the previous count, same shape as the sentAt claim in claimAndSend: two parallel
      // submits must not both read the same wrongGuesses and both write it+1, or the guess budget
      // effectively doubles (review1 §2).
      const prevWrong = Number(attempt.wrongGuesses || 0);
      const wrong = prevWrong + 1;
      const claimed = await AuthAttempt.update({ id: attempt.id, wrongGuesses: prevWrong } as any, { wrongGuesses: wrong }).fetch();
      if (!claimed.length) {
        // Lost the race — a concurrent submit already recorded (and reported) this guess.
        return (await AuthAttempt.findOne({ id: attempt.id })) as AuthAttemptRecord;
      }

      const max = Number((await Settings.get("OTP_MAX_ATTEMPTS")) || 5);
      if (wrong >= max) {
        // Budget spent: destroy the secret rather than leaving a guessable four-digit code alive.
        return await AuthAttempt.updateOne({ id: attempt.id }, { secret: null, failReason: AUTH_FAIL.codeLocked });
      }
      return await AuthAttempt.updateOne({ id: attempt.id }, { failReason: AUTH_FAIL.wrongCode });
    }

    return await this.complete(attempt, ctx, {
      method: attempt.methodOffer as string,
      adapter: attempt.methodAdapter as string,
    });
  }

  /**
   * The attempt this device may still answer, or nothing. "Never existed", "belongs to another
   * device" and "already over" are deliberately one answer: an attempt id is a secret address
   * (design2 §10.2) and the difference is only ever useful to somebody guessing them.
   */
  private static async requireOwned(id: string, deviceId: string): Promise<AuthAttemptRecord> {
    const attempt = await AuthAttempt.load(id, { deviceId, liveOnly: true });
    if (!attempt) throw AUTH_FAIL.expired;
    return attempt;
  }

  // ────────────────────────────────────────────────────────────────────────────
  // completion
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * The single point where an attempt turns into a fact: `proof` on an identity, a User, a
   * session, a ticket. Every path — code, webhook, provider callback — ends here, which is what
   * keeps "verified" from being writable by five different callers (design2 И3, Д7).
   *
   * And the single point where finishing is CLAIMED (И15, signal-idempotency.md §3.2). All four
   * callers — acceptCode, the ANI signal, phone_match, acceptProfile — can be entered twice on
   * the same live attempt (two tabs, a provider retry, two PM2 workers taking one webhook), and
   * none of them could see the other. One conditional UPDATE here covers all of them at once.
   */
  static async complete(attempt: AuthAttemptRecord, ctx: AuthContext, proofSource: { adapter: string; method: string }): Promise<AuthAttemptRecord> {
    const ticket = this.generateTicket();

    // Exactly-once completion (И15). `ticket` is NULL on every live row and has to be minted
    // here anyway, so it doubles as the claim marker: a row carrying one is claimed-or-done, and
    // consumeTicket gates on status `done`, so a ticket on a not-yet-done row is inert.
    // `expiresAt` sits in the same WHERE, which is what makes "the webhook arrived a millisecond
    // after the deadline" resolve against confirmation by construction (design2 §6) instead of
    // depending on how the reader raced with that deadline.
    const claimed = await AuthAttempt.update(
      { id: attempt.id, status: ["started", "awaiting_user"], expiresAt: { ">": Date.now() }, ticket: null } as any,
      { ticket }
    ).fetch();
    if (!claimed.length) {
      // Lost the race, or the attempt is no longer live: hand back what is there, never a session.
      return (await AuthAttempt.findOne({ id: attempt.id })) as AuthAttemptRecord;
    }

    // Whatever the caller read before the claim may already be a step behind (acceptProfile
    // parks the profile in its own conditional UPDATE); the claimed row is the state to finish.
    const live = claimed[0];
    const purpose = String(live.purpose);
    const proof: AuthIdentityProof = { at: Date.now(), method: proofSource.method, adapter: proofSource.adapter, purpose };

    try {
      // Once an attempt is `done`, its deadline stops meaning "you may still answer the step" and
      // starts meaning "this ticket is still good". Without that, a done row was simply never
      // expired by anything (the reader skips a `done` row) and its ticket stayed redeemable for
      // as long as the row existed — which, until the retention window added alongside this, was
      // forever (review1 §3). Minted here, so every purpose gets the same window.
      const ticketExpiresAt = Date.now() + (await AuthAttempt.ttlMs());

      if (purpose === "login") {
        const { user, identity } = await this.resolveLogin(live, proof);
        const userDevice = await User.authDevice(
          user.id as string,
          live.deviceId,
          ctx.deviceName ?? "AUTH",
          ctx.userAgent ?? "",
          ctx.IP ?? "",
          identity?.id as string
        );
        if (identity) await AuthIdentity.updateOne({ id: identity.id }, { lastUsedAt: Date.now() });
        await this.syncUserProjections(user.id as string);
        // `ticket` is not written again here: the claim above already put it on the row.
        return await AuthAttempt.updateOne({ id: live.id }, {
          status: "done",
          expiresAt: ticketExpiresAt,
          user: user.id as string,
          failReason: null,
          customData: { ...this.customData(live), sessionId: userDevice.sessionId as string },
        });
      }

      if (purpose === "link") {
        return await this.completeLink(live, proof, ticketExpiresAt);
      }

      // verify:* / custom:* — the attempt itself proves nothing beyond "this device controls that
      // login right now". For verify:phone that fact is worth persisting as a proof on the
      // identity; for delete_account / unlink_identity the ticket alone is the deliverable.
      if (purpose === "verify:phone" && live.user && live.target) {
        await this.attachIdentity(String(typeof live.user === "string" ? live.user : live.user.id), "phone", live.target as string, { proof, attemptId: live.id as string });
      }
      return await AuthAttempt.updateOne({ id: live.id }, { status: "done", expiresAt: ticketExpiresAt, failReason: null });
    } catch (e) {
      // A refusal the account policy makes deterministically — the identity belongs to somebody
      // else, the cardinality limit, the phone-change switch — is an OUTCOME of the attempt, not
      // a fault, and is recorded as one: status `failed`, the reason on the row, the claim
      // released with it. The caller is as likely to be a webhook as a human, and only the row
      // reaches the person polling authStatus (review2 §3).
      if (typeof e === "string" && COMPLETE_REFUSALS.includes(e)) {
        return await AuthAttempt.updateOne({ id: live.id }, { ticket: null, status: "failed", failReason: e });
      }
      // Anything else is a fault. The claim is written BEFORE the side effects, so it has to be
      // released (same shape as the sentAt rollback in claimAndSend) — otherwise a transient
      // failure leaves an attempt that is still live to look at and can never be completed.
      await AuthAttempt.updateOne({ id: live.id }, { ticket: null });
      throw e;
    }
  }

  /**
   * Turn a finished login attempt into a User. Two shapes reach this point and they must not be
   * confused: a bare proven phone number (OTP, flash-call, dial-in), and a provider profile whose
   * externalId is the anchor (design2 §4.2).
   */
  private static async resolveLogin(attempt: AuthAttemptRecord, proof: AuthIdentityProof): Promise<{ user: UserRecord; identity: AuthIdentityRecord | undefined }> {
    const profile = attempt.pendingProfile as NormalizedProfile | undefined;

    if (profile) {
      const resolved = await this.resolveFromProfile(profile, {
        // Reaching complete() IS the proof — by code, by ANI, or by the provider vouching for the
        // number. So whatever target the attempt carries at this point is owned by whoever is here.
        provenTarget: (attempt.target as string) || undefined,
        proof,
        attemptId: attempt.id as string,
      });
      return resolved;
    }

    const target = attempt.target as string;
    const existing = await AuthIdentity.findByExternal("phone", target);
    const user = await this.liveOwner(existing);
    if (existing && user) {
      // A guest-order identity has no proof until its owner proves it — this is the adoption
      // moment, and the guest's order history lands in the account (extend §5.2).
      const identity = await AuthIdentity.updateOne({ id: existing.id }, { proof, linkedVia: attempt.id as string });
      return { user, identity };
    }
    // No identity, or one whose account is gone: materializeUser reclaims the login string.

    const created = await this.materializeUser({
      phone: this.phoneFromDigits(target),
      proof,
      attemptId: attempt.id as string,
    });
    return created;
  }

  /**
   * Find (or create, and link) a User from a verified provider profile.
   *
   * И2 lives here: an attribute a provider merely claims never becomes a way in on its own, and
   * never takes over a login string that already belongs to somebody else. `provenTarget` is the
   * only phone this function is allowed to treat as owned.
   */
  static async resolveFromProfile(profile: NormalizedProfile, opts: { provenTarget?: string; proof: AuthIdentityProof; attemptId?: string; linkToUser?: string }): Promise<{ user: UserRecord; identity: AuthIdentityRecord | undefined }> {
    const displayName = [profile.firstName, profile.lastName].filter(Boolean).join(" ") || undefined;
    const snapshot = {
      displayName,
      avatarUrl: profile.avatarUrl,
      // The provider's phone is stored as a CLAIM. It is never written as a proof, so turning
      // requirePhoneVerification on later cannot retroactively legalise everything collected
      // while it was off (design2 Д2).
      ...(profile.phone ? { phone: profile.phone as Phone } : {}),
    };

    let identity = await AuthIdentity.findByExternal(profile.provider, profile.externalId);
    let user: UserRecord | undefined;

    if (identity) {
      const owner = await this.liveOwner(identity);
      if (owner) {
        if (opts.linkToUser && opts.linkToUser !== owner.id) throw AUTH_FAIL.identityTaken;
        // Repeat login: the identity IS the anchor. A number changed inside the messenger does
        // not touch this account's key (design2 §4.2).
        identity = await AuthIdentity.updateOne({ id: identity.id }, { ...snapshot, lastUsedAt: Date.now() });
        user = owner;
      } else {
        // The account behind it is gone or deleted: the row is an orphan, and attachIdentity
        // below reclaims the external account for whoever this attempt resolves to.
        identity = undefined;
      }
    }

    if (!user && opts.linkToUser) {
      user = await User.findOne({ id: opts.linkToUser });
    }

    // A phone proven in this very attempt may adopt an existing account; a merely claimed one
    // may not (И2).
    if (!user && opts.provenTarget) {
      const phoneIdentity = await AuthIdentity.findByExternal("phone", opts.provenTarget);
      user = await this.liveOwner(phoneIdentity);
    }

    if (!user) {
      const created = await this.materializeUser({
        ...(opts.provenTarget ? { phone: this.phoneFromDigits(opts.provenTarget) } : {}),
        ...(profile.email ? { email: profile.email } : {}),
        firstName: profile.firstName,
        lastName: profile.lastName,
        proof: opts.provenTarget ? opts.proof : undefined,
        attemptId: opts.attemptId,
      });
      user = created.user;
    } else if (opts.provenTarget) {
      await this.attachIdentity(user.id as string, "phone", opts.provenTarget, { proof: opts.proof, attemptId: opts.attemptId });
    }

    if (!identity) {
      identity = await this.attachIdentity(user.id as string, profile.provider, profile.externalId, {
        proof: opts.proof,
        attemptId: opts.attemptId,
        snapshot,
      });
    }

    await this.syncUserProjections(user.id as string);
    return { user, identity };
  }

  /**
   * The ONLY place a User is created (design2 Д6 — there used to be three, and each of them had
   * to remember to create the identity too).
   *
   * There are no transactions anywhere in this project, so the order is fixed and compensated:
   * User first, identity second, and a unique-key collision on the identity deletes the User we
   * just made rather than leaving an account nobody can ever log into.
   *
   * `email` is a profile attribute here and nothing more: it is written onto the User, never
   * turned into an identity, and never used to find an existing account (design2 Д5, review3
   * §1.2). Only `phone` anchors the account — an account created from a social profile alone
   * carries that provider's identity as its anchor instead.
   */
  static async materializeUser(init: {
    phone?: Phone;
    email?: string;
    firstName?: string;
    lastName?: string;
    proof?: AuthIdentityProof;
    attemptId?: string;
  }): Promise<{ user: UserRecord; identity: AuthIdentityRecord | undefined }> {
    const externalId = init.phone ? this.normalizePhone(init.phone) : undefined;

    if (externalId) {
      const existing = await AuthIdentity.findByExternal("phone", externalId);
      const owner = await this.liveOwner(existing);
      if (existing && owner) {
        const identity = init.proof
          ? await AuthIdentity.updateOne({ id: existing.id }, { proof: init.proof, linkedVia: init.attemptId })
          : existing;
        await this.syncUserProjections(owner.id as string);
        return { user: owner, identity };
      }
      // A row whose account is gone (or soft-deleted) would otherwise block the create below
      // on the unique index — for ever, since nothing else would ever remove it (review2 §3).
      if (existing) await this.releaseOrphan(existing);
    }

    const user = await User.create({
      ...(init.phone ? { phone: init.phone } : {}),
      ...(init.email ? { email: init.email } : {}),
      ...(init.firstName ? { firstName: init.firstName } : {}),
      ...(init.lastName ? { lastName: init.lastName } : {}),
    }).fetch();

    let identity: AuthIdentityRecord | undefined;
    if (externalId) {
      try {
        identity = await AuthIdentity.create({
          provider: "phone",
          externalId,
          user: user.id as string,
          ...(init.phone ? { phone: init.phone } : {}),
          proof: init.proof ?? null,
          linkedAt: Date.now(),
          linkedVia: init.attemptId,
        }).fetch();
      } catch (e) {
        await User.destroy({ id: user.id });
        sails.log.error(`AuthService.materializeUser > identity conflict for phone:${externalId}, user rolled back`, e);
        throw e;
      }
    }

    await this.syncUserProjections(user.id as string);
    return { user, identity };
  }

  // ────────────────────────────────────────────────────────────────────────────
  // the identity set
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Add one identity to an account, subject to the cardinality policy (extend §4).
   *
   * Refusal comes AFTER the proof, not before: whether the external account is already taken can
   * only be known once the provider hands over the externalId. That is expected, and the wording
   * on screen has to match it.
   */
  static async attachIdentity(userId: string, provider: string, externalId: string, opts: { proof?: AuthIdentityProof; attemptId?: string; snapshot?: Record<string, unknown>; label?: string } = {}): Promise<AuthIdentityRecord> {
    const existing = await AuthIdentity.findByExternal(provider, externalId);
    if (existing) {
      const ownerId = typeof existing.user === "string" ? existing.user : existing.user?.id;
      if (!ownerId || ownerId === userId) {
        return await AuthIdentity.updateOne({ id: existing.id }, {
          user: userId,
          ...(opts.snapshot ?? {}),
          ...(opts.proof ? { proof: opts.proof } : {}),
          ...(opts.attemptId ? { linkedVia: opts.attemptId } : {}),
          ...(opts.label ? { label: opts.label } : {}),
        });
      }
      // И14: an identity belonging to somebody else is never taken over, whatever the limits say
      // — unless that somebody is gone. A deleted account keeps no keys (review2 §3), so its row
      // is an orphan and the external account is free to be attached here, subject to the same
      // cardinality check as a brand-new one.
      if (await this.liveOwner(existing)) throw AUTH_FAIL.identityTaken;
      await this.releaseOrphan(existing);
    }

    await this.assertCardinality(userId, provider);

    const incumbent = await this.readIncumbent(userId);
    const identity = await AuthIdentity.create({
      provider,
      externalId,
      user: userId,
      ...(opts.snapshot ?? {}),
      proof: opts.proof ?? null,
      label: opts.label,
      linkedAt: Date.now(),
      linkedVia: opts.attemptId,
    }).fetch();

    // A proven identity is a key to the account, and handing out a key has to be loud (extend
    // §6.1). The single exception is the first one on a fresh account: that is registration —
    // there is nobody to warn and nothing to warn about. An unproven guest-order row is not a
    // key either, so it stays quiet too (extend §5.2).
    // Ahead of syncUserProjections, so the notice still addresses the incumbent (review2 §1.3).
    if (incumbent.hasProven && opts.proof) {
      const sameProvider = (await AuthIdentity.find({ user: userId, provider })).length;
      await this.notifyIdentityChange("user_identity_linked", userId, incumbent, {
        identity: { provider, title: provider, maskedTarget: this.maskIdentity(provider, externalId), at: Date.now() },
        isFirst: sameProvider <= 1,
      });
    }

    await this.syncUserProjections(userId);
    return identity;
  }

  /**
   * The account an identity opens — if it still opens one. `User.delete` is a soft delete, and
   * before review2 §3 nothing in the auth cycle looked at `isDeleted`: the identities stayed, the
   * number stayed occupied, and signing in with it walked straight back into the "deleted"
   * account. One answer for every place that turns an identity into a User: gone and deleted
   * are the same thing here.
   */
  private static async liveOwner(identity: AuthIdentityRecord | undefined): Promise<UserRecord | undefined> {
    const id = identity ? (typeof identity.user === "string" ? identity.user : identity.user?.id) : undefined;
    if (!id) return undefined;
    const user = await User.findOne({ id });
    return user && !user.isDeleted ? user : undefined;
  }

  /**
   * Drop an identity whose account is gone or deleted, so the login string it occupied is free
   * again; the dead account's projections follow the (now empty) set (И13). The orders keep
   * pointing at that account by id — a phone number was never what linked them.
   */
  private static async releaseOrphan(identity: AuthIdentityRecord): Promise<void> {
    const deadOwner = typeof identity.user === "string" ? identity.user : identity.user?.id;
    await AuthIdentity.destroy({ id: identity.id });
    if (deadOwner) await this.syncUserProjections(deadOwner);
  }

  /**
   * Account deletion, the auth half (User.delete calls it): every way in goes with the account.
   * The keys are what "deleted" has to mean — an account that keeps its identities is one the
   * next login re-enters, and whose number nobody else can ever register (review2 §3). Provider
   * revocation is best-effort, as in unlink(): the local link must go even when the provider
   * is down.
   */
  static async forgetAccountIdentities(userId: string): Promise<void> {
    const identities = await AuthIdentity.find({ user: userId });
    for (const identity of identities) {
      try {
        const adapter = AuthMethod.getAdapterBySlug(identity.provider);
        if (adapter && typeof adapter.revoke === "function") await adapter.revoke(identity);
      } catch (e) {
        sails.log.error(`AuthService.forgetAccountIdentities revoke [${identity.provider}]`, e);
      }
    }
    await AuthIdentity.destroy({ user: userId });
    await this.syncUserProjections(userId);
  }

  /** Refuse a link that would exceed the configured cardinality, with a code that says why. */
  private static async assertCardinality(userId: string, provider: string): Promise<void> {
    const max = await AuthMethod.effectiveMaxPerUser(provider);
    if (!max) return; // 0 = unbounded

    const held = await AuthIdentity.find({ user: userId, provider });
    if (held.length < max) return;

    if (provider === "phone") {
      const allowChange = Boolean(await Settings.get("AUTH_ALLOW_PHONE_CHANGE"));
      throw allowChange ? AUTH_FAIL.identityLimit : AUTH_FAIL.phoneChangeDisabled;
    }
    throw AUTH_FAIL.identityLimit;
  }

  /**
   * Finish a `purpose: "link"` attempt, honouring AUTH_LINK_NOTICE_POLICY. Reached only from
   * complete(), which has already claimed the attempt and written its `ticket` (И15).
   */
  private static async completeLink(attempt: AuthAttemptRecord, proof: AuthIdentityProof, ticketExpiresAt: number): Promise<AuthAttemptRecord> {
    const userId = String(typeof attempt.user === "string" ? attempt.user : attempt.user?.id ?? "");
    if (!userId) throw `A link attempt must know its user`;

    const policy = String((await Settings.get("AUTH_LINK_NOTICE_POLICY")) || "notify");
    const incumbent = await this.readIncumbent(userId);

    // `confirm`: the link does not land until the incumbent approves it on their own number.
    // The attempt still succeeds — it holds the proof and hands out a ticket; authLinkConfirm
    // pairs that ticket with a verify:link_identity one (extend §6.4).
    if (policy === "confirm" && incumbent.hasProven) {
      return await AuthAttempt.updateOne({ id: attempt.id }, { status: "done", expiresAt: ticketExpiresAt, failReason: AUTH_FAIL.confirmRequired });
    }

    await this.applyLink(attempt, proof);
    return await AuthAttempt.updateOne({ id: attempt.id }, { status: "done", expiresAt: ticketExpiresAt, failReason: null });
  }

  /** Materialize the identity a finished link attempt proved. */
  private static async applyLink(attempt: AuthAttemptRecord, proof: AuthIdentityProof): Promise<AuthIdentityRecord> {
    const userId = String(typeof attempt.user === "string" ? attempt.user : attempt.user?.id ?? "");
    const profile = attempt.pendingProfile as NormalizedProfile | undefined;

    if (profile) {
      const displayName = [profile.firstName, profile.lastName].filter(Boolean).join(" ") || undefined;
      return await this.attachIdentity(userId, profile.provider, profile.externalId, {
        proof,
        attemptId: attempt.id as string,
        snapshot: { displayName, avatarUrl: profile.avatarUrl, ...(profile.phone ? { phone: profile.phone } : {}) },
      });
    }
    return await this.attachIdentity(userId, "phone", attempt.target as string, {
      proof,
      attemptId: attempt.id as string,
    });
  }

  /**
   * `confirm` mode, second half: the incumbent has proven their own number, so the pending link
   * can land. Both tickets are one-time and both are checked here.
   */
  static async confirmLink(linkTicket: string, confirmTicket: string, deviceId: string): Promise<AuthIdentityRecord> {
    const link = await this.consumeTicket(linkTicket, "link", deviceId);
    const confirm = await this.consumeTicket(confirmTicket, "verify:link_identity", deviceId);
    if (!link || !confirm || link.userId !== confirm.userId) throw AUTH_FAIL.expired;

    const proof: AuthIdentityProof = {
      at: Date.now(),
      method: String(link.attempt.methodOffer),
      adapter: String(link.attempt.methodAdapter),
      purpose: "link",
    };
    return await this.applyLink(link.attempt, proof);
  }

  /**
   * Remove a way in. Not a `destroy()` any more (extend §7): with several ways in, this is the
   * operation somebody takes an account away with, so it needs a fresh proof, it must not strand
   * the account, and it has to kill the sessions it opened.
   */
  static async unlink(userId: string, identityId: string, ticket: string, deviceId: string): Promise<void> {
    // The ticket is spent before the refusal check on purpose: checking first would leave a
    // window in which a concurrent unlink turns this one into the last way in. A refused unlink
    // therefore costs a ticket — `canUnlink` in the account view is what keeps a user from
    // getting here at all.
    const consumed = await this.consumeTicket(ticket, "verify:unlink_identity", deviceId);
    if (!consumed || consumed.userId !== userId) throw AUTH_FAIL.expired;

    const identity = await AuthIdentity.findOne({ id: identityId, user: userId });
    if (!identity) throw `Identity not found`;

    const blocked = await this.unlinkBlockedReason(userId, identity, deviceId);
    if (blocked) throw blocked;

    const incumbent = await this.readIncumbent(userId);
    await AuthIdentity.destroy({ id: identity.id });

    // Otherwise unlinking a compromised way in is cosmetic: the session it opened outlives it (И15).
    await UserDevice.update({ identity: identity.id } as any, { isLoggedIn: false }).fetch();

    // Provider-side cleanup is best-effort — the local link must disappear even when the
    // provider is down, or a retry runs into somebody else's outage.
    try {
      const adapter = AuthMethod.getAdapterBySlug(identity.provider);
      if (adapter && typeof adapter.revoke === "function") await adapter.revoke(identity);
    } catch (e) {
      sails.log.error(`AuthService.unlink revoke [${identity.provider}]`, e);
    }

    // Notice first, projections after — same order as setPrimaryPhone, and for the same reason:
    // the non-SMS channels of this event address `user` as it stands when they run, and the
    // event promises the owner as they were before the change (review2 §1.3).
    await this.notifyIdentityChange("user_identity_unlinked", userId, incumbent, {
      identity: { provider: identity.provider, title: identity.provider, maskedTarget: this.maskIdentity(identity.provider, identity.externalId) },
    });
    await this.syncUserProjections(userId);
  }

  /**
   * Why this identity cannot be unlinked right now, or null. Computed on the server and shipped
   * in the view (§8): a frontend deriving it from the list length is guaranteed to disagree with
   * us at the edges, and to disagree silently — the button is there and pressing it errors.
   */
  static async unlinkBlockedReason(userId: string, identity: AuthIdentityRecord, deviceId?: string): Promise<string | null> {
    const all = await AuthIdentity.find({ user: userId });
    const proven = all.filter((i) => i.proof);

    // И9: never leave an account nobody can get into — the orders and bonuses stay inside it.
    if (identity.proof && proven.length <= 1) return AUTH_FAIL.lastLoginMethod;

    if (identity.provider === "phone" && identity.proof) {
      const allowWithoutPhone = Boolean(await Settings.get("ALLOW_USER_WITHOUT_PHONE"));
      const provenPhones = proven.filter((i) => i.provider === "phone");
      if (!allowWithoutPhone && provenPhones.length <= 1) return AUTH_FAIL.phoneRequired;
      if (!Boolean(await Settings.get("AUTH_ALLOW_PHONE_CHANGE"))) return AUTH_FAIL.phoneChangeDisabled;
    }

    // A key attached minutes ago cannot throw out the older ones: it buys the security notice
    // enough time to be read (extend §7.2).
    if (deviceId) {
      const acting = await this.actingIdentity(deviceId);
      if (acting && acting.id !== identity.id && (await AuthIdentity.isWithinProtectionWindow(acting))) {
        return AUTH_FAIL.protectWindow;
      }
    }
    return null;
  }

  /** Which identity the current session was opened through (UserDevice.identity, extend §3.4). */
  private static async actingIdentity(deviceId: string): Promise<AuthIdentityRecord | undefined> {
    const device = await UserDevice.findOne({ id: deviceId });
    const id = device && (typeof device.identity === "string" ? device.identity : device.identity?.id);
    if (!id) return undefined;
    return await AuthIdentity.findOne({ id });
  }

  /** Move the primary phone to another proven phone-identity. */
  static async setPrimaryPhone(userId: string, identityId: string, ticket: string, deviceId: string): Promise<void> {
    const consumed = await this.consumeTicket(ticket, "verify:phone_change", deviceId);
    if (!consumed || consumed.userId !== userId) throw AUTH_FAIL.expired;

    const identity = await AuthIdentity.findOne({ id: identityId, user: userId, provider: "phone" });
    if (!identity || !identity.proof) throw `Identity not found or not proven`;

    const acting = await this.actingIdentity(deviceId);
    if (acting && acting.id !== identity.id && (await AuthIdentity.isWithinProtectionWindow(acting))) throw AUTH_FAIL.protectWindow;

    // Read the incumbent BEFORE the switch and warn them first. Doing it the other way round is
    // the classic way to make this notice worthless: it would go to the new number, i.e. to
    // whoever just initiated the change (extend §5.3).
    const incumbent = await this.readIncumbent(userId);
    await this.notifyIdentityChange("user_primary_phone_changed", userId, incumbent, {
      from: { maskedTarget: incumbent.phoneHint },
      to: { maskedTarget: this.maskLogin(identity.externalId) },
      at: Date.now(),
    });

    await User.updateOne({ id: userId }, { primaryPhone: identity.id as string } as any);
    await this.syncUserProjections(userId);

    if (!Boolean(await Settings.get("AUTH_PHONE_CHANGE_KEEP_OLD")) && incumbent.primaryPhoneId && incumbent.primaryPhoneId !== identity.id) {
      await AuthIdentity.destroy({ id: incumbent.primaryPhoneId });
      await this.syncUserProjections(userId);
    }
  }

  /**
   * Recompute `User.primaryPhone`, `User.phone` and `User.verified` from the identity set.
   *
   * These three are projections and this is their only writer (И13). They used to be written
   * from five places, including Order.doFinalize marking a guest `verified: true` without a code
   * ever being entered (design2 Д7).
   */
  static async syncUserProjections(userId: string): Promise<void> {
    const user = await User.findOne({ id: userId });
    if (!user) return;

    const phones = await AuthIdentity.find({ user: userId, provider: "phone" });
    const currentId = typeof user.primaryPhone === "string" ? user.primaryPhone : user.primaryPhone?.id;

    // Keep the operator's/user's choice while it still exists; otherwise fall back to the oldest
    // proven number, then to any number at all (a guest identity has no proof).
    const primary =
      phones.find((p) => p.id === currentId) ??
      phones.filter((p) => p.proof).sort((a, b) => Number(a.linkedAt || 0) - Number(b.linkedAt || 0))[0] ??
      phones[0];

    // Phone projections only. `User.email` is a contact, not a projection of any identity: the
    // core cannot prove an address (review3 §1.2), so there is no "verified" for it to project
    // either. Confirming addresses belongs to a module with an email channel and its own
    // `email_link` row, which keeps that state on its side.
    await User.updateOne({ id: userId }, {
      primaryPhone: (primary?.id as string) ?? null,
      // Explicitly null when no phone identity is left: keeping the last known number would
      // leave bonus/RMS adapters keyed to a number the account no longer holds.
      phone: (primary?.phone as Phone) ?? null,
      verified: Boolean(primary?.proof),
    } as any);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // security notices (extend §6)
  // ────────────────────────────────────────────────────────────────────────────

  /** The account as it stands BEFORE the change — the addressee of every notice (И15). */
  /**
   * The login string a step-up must be proven against: the account's own primary phone.
   *
   * `undefined` is a deliberate third answer, distinct from a refusal: the account has no number
   * on record but does have a proven identity (a social-only account), so it can still prove
   * itself — through that identity, which acceptProfile then checks belongs here. No proven way
   * in at all means there is no incumbent to ask, and the operation cannot be authorised at all
   * (review2 §1.2).
   */
  private static async incumbentTarget(userId: string | undefined): Promise<string | undefined> {
    if (!userId) throw AUTH_FAIL.noIncumbent;
    const incumbent = await this.readIncumbent(userId);
    if (incumbent.phone) return this.normalizePhone(incumbent.phone);
    if (!incumbent.hasProven) throw AUTH_FAIL.noIncumbent;
    return undefined;
  }

  private static async readIncumbent(userId: string): Promise<{ userId: string; hasProven: boolean; primaryPhoneId: string | null; phone: Phone | null; phoneHint: string | null }> {
    const user = await User.findOne({ id: userId });
    const identities = await AuthIdentity.find({ user: userId });
    const primaryId = typeof user?.primaryPhone === "string" ? user.primaryPhone : user?.primaryPhone?.id ?? null;
    const primary = identities.find((i) => i.id === primaryId) ?? identities.find((i) => i.provider === "phone" && i.proof);
    return {
      userId,
      hasProven: identities.some((i) => i.proof),
      primaryPhoneId: (primary?.id as string) ?? null,
      phone: (primary?.phone as Phone) ?? null,
      phoneHint: primary ? this.maskLogin(primary.externalId) : null,
    };
  }

  /**
   * Announce a change to the set of ways in.
   *
   * One delivery, through the pipeline, pinned to what makes the notice worth sending: the
   * seeded rules (`user_identity_*_sms`) are `channelsMode: fixed / ["sms"]` and `important`,
   * because SMS is the only channel tied to the SIM rather than to a session — and a session is
   * what an attacker already has (extend §6.2). The templates are text only: no code, no token,
   * and no "this wasn't me" link, which would be a new unauthenticated entry point on the very
   * channel we are defending.
   *
   * An operator can switch a rule off in the admin panel, which the previous direct send did not
   * allow; the merged `otp_delivery` checkup is what reports that state (review3 §1.8). Turning
   * the notices off wholesale is still `AUTH_LINK_NOTICE_POLICY=off`.
   */
  private static async notifyIdentityChange(event: string, userId: string, incumbent: { phone: Phone | null; phoneHint: string | null }, context: Record<string, unknown>): Promise<void> {
    const policy = String((await Settings.get("AUTH_LINK_NOTICE_POLICY")) || "notify");
    if (policy === "off") return;

    const user = await User.findOne({ id: userId });
    if (!user) return;

    try {
      const results = await NotificationService.emit(event, {
        recipient: {
          userId,
          user,
          // The address is the SNAPSHOT, not the projection. `User.phone` is recomputed from the
          // identity set by syncUserProjections, so by delivery time it is already the number
          // AFTER the change — for an unlink of the primary phone that is the remaining number
          // (or none), i.e. the one person this notice exists for would never receive it. extend
          // §6.2 and NotificationEventRegistry say "the number on record before the change" in as
          // many words; this is what makes that true (review2 §1.3).
          ...(incumbent.phone ? { address: { phone: incumbent.phone } } : {}),
        },
        context: { user: { firstName: user.firstName, lastName: user.lastName, email: user.email }, ...context },
        groupTo: "user",
        meta: {
          sourceModule: "core/auth",
          // Every change is its own alarm. The auto-built key would be `event_type_userId`, under
          // which the SECOND change to an account is dropped as a duplicate send — and two
          // changes in a row is exactly what a takeover looks like. There is no natural anchor
          // for "this one change" and no retry path that would want one (the notice is sent once,
          // after the write that caused it), so the key is simply unique.
          idempotencyKey: `${event}_${userId}_${uuid()}`,
        },
      });
      // Nothing went out: the rule is switched off, or every channel it names is unregistered.
      // That is the operator's to decide and not ours to override — but it is the alarm on an
      // account takeover, so it does not get to fail in silence. `otp_delivery` says the same
      // thing on the setup checklist, before the first change rather than after it.
      if (!results.some((entry) => entry.status === "sent" || entry.status === "scheduled")) {
        sails.log.warn(`AuthService.notifyIdentityChange [${event}] user ${userId}: nothing was delivered (${results.map((entry) => `${entry.typeKey}:${entry.status}`).join(", ") || "no enabled rule"})`);
      }
    } catch (e) {
      sails.log.error(`AuthService.notifyIdentityChange emit [${event}]`, e);
    }
  }

  private static maskIdentity(provider: string, externalId: string): string {
    return provider === "phone" ? this.maskLogin(externalId) : this.maskHandle(externalId);
  }

  // ────────────────────────────────────────────────────────────────────────────
  // tickets
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * Spend the one-time result of an attempt. `purpose` is checked, which is the whole of design2
   * §10.3: a code minted for signing in no longer opens account deletion or an unlink.
   * `expiresAt` is checked for the same reason it is rewritten by complete(): one-time is not the
   * same as timeless, and a ticket lying in a client's storage should stop working with the
   * attempt that produced it.
   */
  static async consumeTicket(ticket: string, purpose: AuthPurpose, deviceId?: string): Promise<{ attempt: AuthAttemptRecord; userId: string | null } | undefined> {
    if (!ticket) return undefined;

    // Conditional update, so two parallel redemptions cannot both win. `deviceId` is part of the
    // SAME condition, not a check afterwards (review1 §2): a caller on another device that merely
    // knows the ticket string must not be able to burn it out from under its owner.
    const claimed = await AuthAttempt.update(
      { ticket, purpose, status: "done", ticketConsumedAt: null, expiresAt: { ">": Date.now() }, ...(deviceId ? { deviceId } : {}) } as any,
      { ticketConsumedAt: Date.now() }
    ).fetch();
    if (!claimed.length) return undefined;

    const attempt = claimed[0];
    const userId = typeof attempt.user === "string" ? attempt.user : attempt.user?.id ?? null;
    return { attempt, userId };
  }

  // ────────────────────────────────────────────────────────────────────────────
  // provider signals
  // ────────────────────────────────────────────────────────────────────────────

  /**
   * A provider told us something out of band (bot webhook, flash-call number, dial-in ANI).
   * Adapters authenticate their own callers and hand back a Signal; deciding what it means to
   * the account is this class's job alone.
   *
   * A signal is an ANSWER TO A STEP, exactly like a code typed by a human — so it is applied the
   * same way: a conditional UPDATE naming the step it answers (И15). Providers retry, bodies get
   * replayed, and two PM2 workers can take one delivery; every one of those is "an answer to a
   * step that has already moved on" and dies against the WHERE. No event-level dedup by a
   * provider-side id is needed — see signal-idempotency.md §1 for why one cannot be relied on.
   */
  static async handleSignal(signal: Signal, ctx: Partial<AuthContext> = {}): Promise<AuthAttemptRecord | undefined> {
    if (signal.kind === "ani") {
      // Dial-in: the live attempt is the one leasing that number and still waiting for the call,
      // and the caller has to be the number we are proving. `complete` claims for itself, so a
      // retry of the same call finds the attempt already ticketed and does nothing.
      const attempts = await AuthAttempt.find({ where: { providerRef: signal.dnis, stepType: "dial_number", status: ["started", "awaiting_user"] } as any });
      const attempt = attempts.find((a) => this.normalizePhone(String(a.target)) === this.normalizePhone(signal.ani));
      if (!attempt) return undefined;
      return await this.complete(attempt, { deviceId: attempt.deviceId, ...ctx }, { adapter: attempt.methodAdapter as string, method: attempt.methodOffer as string });
    }

    const attempt = await AuthAttempt.load(signal.attemptId, { liveOnly: true });
    // A cheap first filter, and where an overdue row gets marked `expired`. It is NOT the guard:
    // the guard is the condition inside each UPDATE below (И15).
    if (!attempt) return undefined;

    if (signal.kind === "code") {
      // A deferred flash-call number finally landed: fill in the secret and open the field.
      // Conditional on the step being the one that waits for it — a repeat would otherwise mint a
      // new step.id under a user who is already typing, and their code would come back
      // `stale_step` forever (signal-idempotency.md §2.2). `secret: null` is part of the same
      // condition: a flash-call that was not deferred already has its secret, and an unsolicited
      // `code` signal must not replace it.
      const extract = this.customData(attempt).extract;
      const secret = extract ? this.extractSecret(signal.code, JSON.parse(extract)) : signal.code;
      const opened = await AuthAttempt.update(
        { id: attempt.id, status: ["started", "awaiting_user"], stepType: "await_signal", secret: null } as any,
        {
          secret,
          step: this.buildStep("enter_code", { codeLength: secret.length, expiresInSeconds: Math.max(0, Math.round((Number(attempt.secretExpiresAt || 0) - Date.now()) / 1000)) }),
          stepType: "enter_code",
        }
      ).fetch();
      return opened[0] ?? ((await AuthAttempt.findOne({ id: attempt.id })) as AuthAttemptRecord);
    }

    if (signal.kind === "phone_match") {
      // The messenger proves the number IT has, not the one we chose — so a mismatch is its own
      // outcome, not "wrong code" (design2 §7.5). No AuthIdentity is created: we are not signing
      // in as that person, only using them to prove a number.
      if (!signal.matched) {
        const failed = await AuthAttempt.update(
          { id: attempt.id, status: ["started", "awaiting_user"] } as any,
          { status: "failed", failReason: AUTH_FAIL.phoneMismatch }
        ).fetch();
        return failed[0] ?? ((await AuthAttempt.findOne({ id: attempt.id })) as AuthAttemptRecord);
      }
      return await this.complete(attempt, { deviceId: attempt.deviceId, ...ctx }, { adapter: attempt.methodAdapter as string, method: attempt.methodOffer as string });
    }

    return await this.acceptProfile(attempt, signal.profile, ctx);
  }

  /**
   * A verified provider profile arrived. Either it finishes the attempt outright, or it becomes
   * the target of a phone-proof step — that decision is `requirePhoneVerification` (the
   * operator's) crossed with `canVerifyPhone` (the protocol's), never one standing in for the
   * other (И4).
   */
  static async acceptProfile(attempt: AuthAttemptRecord, profile: NormalizedProfile, ctx: Partial<AuthContext> = {}): Promise<AuthAttemptRecord> {
    const row = await AuthMethod.getBySlugOffer(attempt.methodAdapter as string, attempt.methodOffer as string);
    // "Proven" needs a number to have been proven. `phoneVerifiedByProvider` without `phone` is
    // an adapter defect, and the fallback it used to get — the attempt's own `target`, i.e. a
    // number the client typed at authStart and nobody has checked — turned that defect into a
    // sign-in as whoever owns that number (review2 §2.4). It now reads as "not proven": the
    // profile lands on the phone-proof step like any other unverified one.
    const providerProvesPhone = Boolean(row?.canVerifyPhone && profile.phoneVerifiedByProvider && profile.phone);
    const gate = Boolean(row?.requirePhoneVerification);

    // A step-up is about the incumbent, and a messenger account proves the incumbent only when
    // it already IS one of this account's proven ways in. Otherwise the attacker signs into
    // their own Telegram and walks out with a ticket to delete somebody else's account — the
    // identity half of review2 §1.2. Refused as an outcome, not thrown: half the callers here
    // are webhooks, which have nobody to throw to.
    if (INCUMBENT_BOUND_PURPOSES.includes(String(attempt.purpose)) && !(await this.provesIncumbent(attempt, profile))) {
      const failed = await AuthAttempt.update(
        { id: attempt.id, status: ["started", "awaiting_user"] } as any,
        { status: "failed", failReason: AUTH_FAIL.noIncumbent }
      ).fetch();
      return failed[0] ?? ((await AuthAttempt.findOne({ id: attempt.id })) as AuthAttemptRecord);
    }

    if (providerProvesPhone && !gate) {
      // The profile answers the identity step, so parking it is conditional on that step still
      // being the live one (И15): a bot retry or an F5 on the callback URL must not rewrite the
      // `target` of an attempt whose completion is already under way.
      const stored = await AuthAttempt.update(
        { id: attempt.id, status: ["started", "awaiting_user"], stepType: IDENTITY_STEP_TYPES } as any,
        {
          pendingProfile: profile,
          target: this.normalizePhone(profile.phone as Phone),
        }
      ).fetch();
      if (!stored.length) return (await AuthAttempt.findOne({ id: attempt.id })) as AuthAttemptRecord;

      return await this.complete(stored[0], { deviceId: attempt.deviceId, ...ctx }, {
        adapter: attempt.methodAdapter as string,
        method: attempt.methodOffer as string,
      });
    }

    return await this.beginPhoneProof(attempt, profile);
  }

  /** Is this profile one of the account's own proven identities? (review2 §1.2) */
  private static async provesIncumbent(attempt: AuthAttemptRecord, profile: NormalizedProfile): Promise<boolean> {
    const userId = typeof attempt.user === "string" ? attempt.user : attempt.user?.id;
    if (!userId) return false;
    const identity = await AuthIdentity.findByExternal(profile.provider, profile.externalId);
    if (!identity || !identity.proof) return false;
    const ownerId = typeof identity.user === "string" ? identity.user : identity.user?.id;
    return ownerId === userId;
  }

  /**
   * Park a profile and move to proving a phone for it. The code is NOT sent here: it goes out
   * when the user actually reaches the form (design2 §7.2), so somebody who opened the messenger
   * and closed the tab costs nothing.
   */
  private static async beginPhoneProof(attempt: AuthAttemptRecord, profile: NormalizedProfile): Promise<AuthAttemptRecord> {
    const fromProfile = profile.phone ? this.normalizePhone(profile.phone as Phone) : undefined;
    // A step-up's target is the account's, and a profile does not get to move it — least of all
    // to `null`, which would republish `enter_phone` and put the choice back in the client's
    // hands (review2 §1.2). Falling back to the incumbent number here is the right outcome
    // anyway: the provider did not prove a phone, so the code goes to the one on record.
    const incumbentBound = INCUMBENT_BOUND_PURPOSES.includes(String(attempt.purpose));
    const target = incumbentBound ? ((attempt.target as string) ?? fromProfile) : fromProfile;
    const existing = this.customData(attempt);
    const custom = { ...existing, identityAdapter: attempt.methodAdapter };

    // Parking is the move off the identity step, so it is claimed on that step (И15). Without
    // the condition, a repeated profile re-parks and applyMethod rebuilds the step underneath a
    // user who is already looking at the phone/code form — and their input dies as `stale_step`.
    const claimed = await AuthAttempt.update(
      { id: attempt.id, status: ["started", "awaiting_user"], stepType: IDENTITY_STEP_TYPES } as any,
      {
        pendingProfile: profile,
        target: target ?? null,
        customData: custom,
      }
    ).fetch();
    if (!claimed.length) return (await AuthAttempt.findOne({ id: attempt.id })) as AuthAttemptRecord;
    const parked = claimed[0];

    const usable = await this.proofMethodsFor(target, attempt.purpose as string, { salesChannel: existing.salesChannel, country: existing.country, deviceId: attempt.deviceId });
    return await this.applyFirstUsable(parked, usable, { deliverNow: false });
  }

  // ────────────────────────────────────────────────────────────────────────────
  // views
  // ────────────────────────────────────────────────────────────────────────────

  /** The public face of an attempt. `ticket` is released only to the device that owns it (§10.2). */
  static async view(attempt: AuthAttemptRecord | undefined, deviceId: string): Promise<AuthAttemptView> {
    if (!attempt || attempt.deviceId !== deviceId) {
      return { id: "", status: "expired", step: null, ticket: null, phoneHint: null, method: null, availableMethods: [], nextAttemptAfterSeconds: 0, attemptsLeft: null, failReason: null };
    }

    const terminal = AuthAttempt.isTerminal(attempt.status);
    // Counted off the target's own ledger, not off this attempt's sentAt: the client has to be
    // told the truth about when the next code may go out, and that truth spans attempts and
    // survives an authSwitch (И6, review1 §1.2).
    // A terminal attempt has nothing left to send — except when what ended it was the budget:
    // then the one thing the client still needs is when authStart is worth calling again, and
    // zero would read as "right now" (review3 §5.4).
    const nextAttemptAfterSeconds =
      terminal && attempt.failReason !== AUTH_FAIL.rateLimited ? 0 : await this.nextSendAfterSeconds(attempt);

    const available = terminal ? [] : await this.availableMethods(attempt, deviceId);

    const max = Number((await Settings.get("OTP_MAX_ATTEMPTS")) || 5);

    return {
      id: attempt.id as string,
      status: attempt.status as string,
      // No step on a terminal attempt: there is nothing left to draw.
      step: terminal || !attempt.step ? null : { ...attempt.step, expiresInSeconds: this.stepSecondsLeft(attempt) },
      // Same window consumeTicket redeems in — a client must not be shown a ticket that the
      // conditional UPDATE behind authExchange is already going to refuse.
      ticket: attempt.status === "done" && !attempt.ticketConsumedAt && Number(attempt.expiresAt || 0) > Date.now() ? ((attempt.ticket as string) ?? null) : null,
      phoneHint: attempt.target ? this.maskLogin(attempt.target as string) : null,
      method: attempt.methodAdapter ? `${attempt.methodAdapter}:${attempt.methodOffer}` : null,
      availableMethods: available,
      nextAttemptAfterSeconds,
      attemptsLeft: attempt.stepType === "enter_code" ? Math.max(0, max - Number(attempt.wrongGuesses || 0)) : null,
      failReason: (attempt.failReason as string) ?? null,
    };
  }

  /**
   * The switchable methods for this attempt, memoised for METHODS_MEMO_TTL_MS. Keyed by
   * everything proofMethodsFor() actually looks at, so changing the target answers honestly on
   * the very next poll; a registry row toggled in the admin panel takes up to the TTL to show,
   * which is the price of not paying a provider once a second.
   */
  private static async availableMethods(attempt: AuthAttemptRecord, deviceId: string): Promise<string[]> {
    const custom = this.customData(attempt);
    const key = [attempt.target ?? "", attempt.purpose ?? "", custom.salesChannel ?? "", custom.country ?? ""].join("|");
    const id = String(attempt.id);

    const hit = METHODS_MEMO.get(id);
    if (hit && hit.key === key && Date.now() - hit.at < METHODS_MEMO_TTL_MS) return hit.methods;

    const methods = (await this.proofMethodsFor(attempt.target as string, attempt.purpose as string, { salesChannel: custom.salesChannel, country: custom.country, deviceId })).map((r) => this.rowKey(r));

    // Attempts are short-lived and so is this map, but a busy instance should not grow it without
    // bound: drop what has aged out before adding.
    if (METHODS_MEMO.size >= METHODS_MEMO_MAX) {
      const deadline = Date.now() - METHODS_MEMO_TTL_MS;
      for (const [k, v] of METHODS_MEMO) if (v.at < deadline) METHODS_MEMO.delete(k);
      if (METHODS_MEMO.size >= METHODS_MEMO_MAX) METHODS_MEMO.clear();
    }
    METHODS_MEMO.set(id, { key, methods, at: Date.now() });
    return methods;
  }

  private static stepSecondsLeft(attempt: AuthAttemptRecord): number {
    const deadline = Number(attempt.secretExpiresAt || attempt.expiresAt || 0);
    return Math.max(0, Math.round((deadline - Date.now()) / 1000));
  }

  /** The personal cabinet's picture of the account: what is attached, and what may be done to it. */
  static async accountView(userId: string, deviceId: string, ctx: { salesChannel?: string; country?: string } = {}): Promise<{ identities: IdentityView[]; policy: AccountPolicyView }> {
    const identities = await AuthIdentity.find({ user: userId }).sort("linkedAt ASC");
    const user = await User.findOne({ id: userId });
    const primaryId = typeof user?.primaryPhone === "string" ? user.primaryPhone : user?.primaryPhone?.id ?? null;

    const views: IdentityView[] = [];
    for (const identity of identities) {
      const blocked = await this.unlinkBlockedReason(userId, identity, deviceId);
      views.push({
        id: identity.id as string,
        provider: identity.provider,
        title: identity.displayName || identity.provider,
        hint: this.maskIdentity(identity.provider, identity.externalId),
        label: (identity.label as string) ?? null,
        isPrimaryPhone: identity.id === primaryId,
        proofAt: (identity.proof as AuthIdentityProof)?.at ?? null,
        proofMethod: (identity.proof as AuthIdentityProof)?.method ?? null,
        linkedAt: (identity.linkedAt as number) ?? null,
        lastUsedAt: (identity.lastUsedAt as number) ?? null,
        canUnlink: !blocked,
        unlinkBlockedReason: blocked,
      });
    }

    const maxPhones = await AuthMethod.effectiveMaxPerUser("phone");
    const phones = identities.filter((i) => i.provider === "phone");

    const linkable: AccountPolicyView["linkable"] = [];
    for (const row of await this.identityMethodsFor("link", ctx)) {
      const max = await AuthMethod.effectiveMaxPerUser(row.adapter);
      const held = identities.filter((i) => i.provider === row.adapter).length;
      linkable.push({ provider: row.adapter, title: row.titleKey || row.adapter, freeSlots: max ? Math.max(0, max - held) : -1 });
    }

    const incumbent = await this.readIncumbent(userId);
    return {
      identities: views,
      policy: {
        canAddPhone: !maxPhones || phones.length < maxPhones,
        canChangePhone: Boolean(await Settings.get("AUTH_ALLOW_PHONE_CHANGE")),
        maxPhones,
        linkable,
        noticePolicy: String((await Settings.get("AUTH_LINK_NOTICE_POLICY")) || "notify"),
        noticeTargetHint: incumbent.phoneHint,
      },
    };
  }
}

export default AuthService;
