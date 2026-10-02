import { AuthAttemptRecord } from "../../models/AuthAttempt";
import { AuthIdentityRecord } from "../../models/AuthIdentity";
// `AuthMethod` itself is a Sails global (declared in models/AuthMethod.ts) — the registry row is
// created from the constructor below, the same way PaymentAdapter self-registers a PaymentMethod.

/**
 * Flow types an identity offer can implement. The core drives every identity provider through
 * the same two phases (`start` / `complete`); the flow only tells the frontend how to present
 * the button and where the `complete` data comes from.
 */
export type AuthFlowKind =
  | "oauth2"        // redirect to provider, code → token → profile (VK, Yandex, FB, generic)
  | "oidc"          // oauth2 subtype with id_token (Google/Apple/Keycloak)
  | "bot_dialog"    // login through a messenger bot dialog + "share contact" (Telegram, MAX)
  | "signed_widget" // provider-signed widget embedded on the page (e.g. Telegram Login Widget)
  | "email_link";   // magic-link / code sent to email

/** How a phone_proof offer shows itself on the client (mirrors the wire `step.type`). */
export type PhoneProofMode = "enter_code" | "dial_number" | "await_signal";

/** Who invented the secret for a phone_proof offer. */
export type SecretOrigin = "server" | "provider" | "none";

/** What the client has to show/do right now. `id` is the step version (design2 И7). */
export type StepType = "provider_dialog" | "redirect" | "enter_phone" | "enter_code" | "dial_number" | "await_signal";

/** One declared capability of an adapter — one row in AuthMethod. */
export type Offer =
  | { kind: "identity"; offer: string; flow: AuthFlowKind; canVerifyPhone?: boolean }
  | { kind: "phone_proof"; offer: string; mode: PhoneProofMode; secretOrigin: SecretOrigin; codeLength?: number };

export interface InitAuthAdapter {
  /** slug (telegram, max, smsc, zvonok, core, …) — unique per module */
  adapter: string;
  offers: Offer[];
  title: string;
  hint?: string;
  iconUrl?: string;
  buttonColor?: string;
  buttonTextColor?: string;
  sortOrder?: number;
  cost?: number;
  /** purposes rows are seeded with on first create (operator can change later) */
  defaultPurposes?: string[];
  /**
   * Only meaningful for identity offers: seed of the operator-owned `requirePhoneVerification`
   * on the row — "send a phone-proof code after this provider's login anyway".
   *
   * For a `bot_dialog` flow declare it `true`. The dialog is opened through a deep-link or QR
   * that carries the attempt id, i.e. the attempt's address, and an address can be forwarded:
   * whoever opens the link and presses "share contact" finishes the attempt of whoever STARTED
   * it. `canVerifyPhone` then holds — the number is proven — but proven by the wrong person, and
   * the session lands on the starter's device (review2 §2.5). The gate is the only thing in the
   * cycle that ties the finish back to the device that started, so a bot-dialog adapter that
   * seeds it off ships that attack enabled. The operator can still switch it off per row.
   */
  requirePhoneVerification?: boolean;
  config?: Record<string, unknown>;
  providerModule?: string;
  /**
   * `enable` for rows this adapter creates on first registration, instead of
   * DEFAULT_ENABLE_AUTH_PROVIDERS. For adapters that need no configuration to work (the core's
   * own OTP) — a provider that starts disabled is a choice, a baseline that starts disabled is
   * an installation nobody can sign in to (review2 §1.1). Operator-owned afterwards, like the rest.
   */
  enabledByDefault?: boolean;
}

/**
 * Normalized profile an identity adapter MUST return after verifying the callback/webhook.
 * The core turns this into a User + session; the adapter never touches User/UserDevice/JWT.
 */
export interface NormalizedProfile {
  provider: string;   // slug, equals AuthMethod.adapter
  externalId: string; // stable id at the provider (sub/uid/tg id/max id)
  phone?: { code: string; number: string };
  phoneVerifiedByProvider?: boolean; // provider guarantees the phone (bot contact) === offer.canVerifyPhone
  email?: string;     // a contact: lands on User.email for a new account, never a way in
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  raw?: Record<string, unknown>;
}

export type StartResult = {
  redirectUrl?: string;
  clientPayload?: Record<string, unknown>;
  providerRef?: string;
  ttlSec?: number;
  /** flashcall: the code is right there in the response */
  expectedSecret?: string;
  /** …or a spec to extract it later once the caller number is known */
  extract?: { anchor: "head" | "tail"; offset: number; length: number };
  /** flashcall: full number that will call — NEVER forwarded to the client (И1, §10.1) */
  callerNumber?: string;
  /** callback/dial_number: number the user has to dial — forwarded to the client */
  dialNumber?: string;
  /** the secret/signal will arrive later via a webhook, not in this response */
  deferred?: boolean;
};

export interface AuthCompleteInput {
  query?: Record<string, string>;
  body?: Record<string, unknown>;
  attempt?: AuthAttemptRecord;
}

export interface WebhookMeta {
  headers?: Record<string, string | undefined>;
}

/** What handleWebhook hands back to AuthService once a signal for a pending attempt arrives. */
export type Signal =
  | { kind: "profile"; attemptId: string; profile: NormalizedProfile }
  | { kind: "code"; attemptId: string; code: string }
  | { kind: "phone_match"; attemptId: string; matched: boolean }
  | { kind: "ani"; dnis: string; ani: string };

export interface StartContext {
  deviceId: string;
  attemptId: string;
  target?: string;
  salesChannel?: string;
  country?: string;
  locale?: string;
  redirectBack?: string;
}

/**
 * Single contract for every way to prove identity or phone ownership. The concrete
 * implementation lives in an npm/hook module; the constructor self-registers every declared
 * offer into AuthMethod via `AuthMethod.alive(this)` (mirrors the PaymentAdapter pattern).
 *
 * The adapter ONLY talks to the provider. All domain logic — create/link User, cardinality,
 * session issuance, JWT — stays in AuthService, so the policy is single-sourced (design2 §5).
 */
export default abstract class AuthAdapter {
  public readonly slug: string;
  public readonly offers: Offer[];
  public readonly title: string;
  public readonly hint?: string;
  public readonly iconUrl?: string;
  public readonly buttonColor?: string;
  public readonly buttonTextColor?: string;
  public readonly sortOrder?: number;
  public readonly cost?: number;
  public readonly defaultPurposes?: string[];
  public readonly requirePhoneVerification?: boolean;
  public readonly providerModule?: string;
  public readonly enabledByDefault?: boolean;
  public config: Record<string, unknown>;
  private initializationPromise: Promise<void>;

  protected constructor(init: InitAuthAdapter) {
    this.slug = init.adapter;
    this.offers = init.offers;
    this.title = init.title;
    this.hint = init.hint;
    this.iconUrl = init.iconUrl;
    this.buttonColor = init.buttonColor;
    this.buttonTextColor = init.buttonTextColor;
    this.sortOrder = init.sortOrder;
    this.cost = init.cost;
    this.defaultPurposes = init.defaultPurposes;
    this.requirePhoneVerification = init.requirePhoneVerification;
    this.providerModule = init.providerModule ?? (init.config?.providerModule as string);
    this.enabledByDefault = init.enabledByDefault;
    this.config = init.config ?? {};
    this.initializationPromise = AuthMethod.alive(this);
  }

  /** Waits until self-registration into AuthMethod has finished. */
  public async wait(): Promise<void> {
    await this.initializationPromise;
  }

  /**
   * Begin a step at the provider: identity → redirect/deep-link; phone_proof → order a
   * call/flashcall or hand back a number to dial. Never creates a User.
   *
   * This is also the delivery point, and the ONLY one: AuthService calls it exactly once per
   * attempt, after it has won the `sentAt` compare-and-set (И8). There is no separate `deliver`
   * hook and no afterCreate side-effect, because the whole point of design2 §4.3 is that a
   * flash-call must not be able to leak out as an SMS just by existing.
   *   - secretOrigin=server   → `attempt.secret` is already filled in; send it.
   *   - secretOrigin=provider → produce it (`expectedSecret`, or `callerNumber` + `extract`).
   *   - secretOrigin=none     → nothing is sent at all (dial-in, share-contact).
   *
   * "Send it again" is another `start()`, never a method of its own: for a provider-owned secret
   * a repeat IS a second call, and a second call carries a second secret — AuthService therefore
   * rebuilds the step around it. An adapter has nothing to add to that, so there is nothing here
   * for it to implement (review3 §5.2).
   */
  public abstract start(attempt: AuthAttemptRecord, offer: Offer): Promise<StartResult>;

  /**
   * identity: cryptographically verify the callback (state, id_token signature, bot hash) and
   * return the normalized profile. Throws on invalid signature/nonce/freshness.
   */
  public complete?(input: AuthCompleteInput, offer: Offer): Promise<NormalizedProfile>;

  /**
   * Parse a raw provider webhook (bot_dialog, dial_number ANI). Authenticates the caller
   * internally (signature/secret header) — the body itself is not trusted. Returns null to
   * ignore the update.
   */
  public handleWebhook?(body: Record<string, unknown>, meta: WebhookMeta): Promise<Signal | null>;

  /** Cancel the in-flight request at the provider (release a leased dial-in number, etc). */
  public cancel?(attempt: AuthAttemptRecord): Promise<void>;

  /** Whether this offer can serve `target` at all (country / line type / MVNO). */
  public supports?(offer: Offer, target: string, ctx: StartContext): Promise<boolean>;

  public async healthcheck(): Promise<{ ok: boolean; message?: string }> {
    return { ok: true };
  }

  /** best-effort logout on the provider side */
  public revoke?(identity: AuthIdentityRecord): Promise<void>;

  /**
   * "A confirmation code was just sent elsewhere" — in the provider's OWN channel. Best-effort.
   * MUST NOT contain the code itself (И1): the code proves phone ownership, not provider-account
   * ownership; putting it in the provider channel hands it to whoever controls that account.
   */
  public notifySideChannel?(attempt: AuthAttemptRecord, info: { hint: string; ttlSec: number }): Promise<void>;
}
