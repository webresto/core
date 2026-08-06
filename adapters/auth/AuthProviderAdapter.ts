import { AuthIdentityRecord } from "../../models/AuthIdentity";

/**
 * Flow types an auth provider can implement. The core drives every provider through
 * the same two phases (`start` / `complete`); the flow type only tells the frontend
 * how to present the button and where the `complete` data comes from.
 */
export type AuthFlowKind =
  | "oauth2"          // redirect to provider, code → token → profile (VK, Yandex, FB, generic)
  | "oidc"            // oauth2 subtype with id_token (Google/Apple/Keycloak)
  | "signed_widget"   // provider-signed widget embedded on the page (e.g. Telegram Login Widget)
  | "bot_dialog"       // login through a messenger bot dialog + "share contact" (e.g. Telegram, MAX)
  | "email_link"       // magic-link / code sent to email
  | "phone_otp";       // baseline, implemented by the core (OTP adapter)

/**
 * Normalized profile the adapter MUST return after it has verified the callback.
 * The core turns this into a User + session; the adapter never touches User/UserDevice/JWT.
 */
export interface NormalizedProfile {
  provider: string;           // slug, equals AuthProvider.adapter
  externalId: string;         // stable id at the provider (sub/uid/tg id/max id)
  // everything below is best-effort and may be absent:
  phone?: { code: string; number: string };  // if the provider returned a phone
  phoneVerifiedByProvider?: boolean;          // provider guarantees the phone (Telegram/MAX contact = true)
  email?: string;
  emailVerifiedByProvider?: boolean;
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  raw?: Record<string, unknown>;              // raw provider response for debugging/custom mapping
}

export interface AuthStartResult {
  kind: AuthFlowKind;
  redirectUrl?: string;                       // oauth2/oidc: where to send the browser
  clientPayload?: Record<string, unknown>;    // arbitrary client data (bot deep-link, widget params, QR)
  stateToPersist?: Record<string, unknown>;   // server state saved into AuthState (state/nonce/pkce)
}

export interface AuthCompleteInput {
  query?: Record<string, string>;   // ?code=…&state=…
  body?: Record<string, unknown>;   // webhook body / telegram / max data
  state?: Record<string, unknown>;  // restored AuthState
}

export interface WebhookMeta {
  /** Lower-cased request headers, so the adapter can authenticate the caller of a bot webhook. */
  headers?: Record<string, string | undefined>;
}

export interface StartContext {
  deviceId: string;
  stateId?: string;
  salesChannel?: string;
  country?: string;
  locale?: string;
  redirectBack?: string;
}

export interface InitAuthAdapter {
  adapter: string;                          // slug (telegram, max, vk …) — unique
  title: string;                            // "Telegram", "ВКонтакте"
  kind: AuthFlowKind;
  iconUrl?: string;
  buttonColor?: string;
  buttonTextColor?: string;
  sortOrder?: number;
  config?: Record<string, unknown>;         // clientId/secret/botToken … (from AuthProvider.config)
  // Default phone-verification policy seeded on first registration (operator can override in admin):
  trustProviderPhone?: boolean;             // trust a phone the provider marks verified (bot contact) without OTP
  requirePhoneVerification?: boolean;       // force OTP phone confirmation after this provider's login
}

/**
 * Abstract contract for one *type* of auth provider. The concrete implementation lives in
 * an npm/hook module. Mirrors the PaymentAdapter pattern: the constructor self-registers the
 * provider into the AuthProvider model via `AuthProvider.alive(this)`.
 *
 * The adapter ONLY:
 *  - builds a redirect / client payload (`start`)
 *  - cryptographically verifies the callback and returns a NormalizedProfile (`complete`)
 * All the domain logic (create/link User, issue session, JWT) stays in the core (AuthService),
 * so the policy is single-sourced.
 */
export default abstract class AuthProviderAdapter {
  public readonly InitAuthAdapter: InitAuthAdapter;
  public config: Record<string, unknown>;
  private initializationPromise: Promise<void>;

  protected constructor(init: InitAuthAdapter) {
    this.InitAuthAdapter = init;
    this.config = init.config ?? {};
    this.initializationPromise = this.initialize();
  }

  /** Waits until self-registration into AuthProvider has finished. */
  public async wait(): Promise<void> {
    await this.initializationPromise;
  }

  private async initialize(): Promise<void> {
    await AuthProvider.alive(this);
  }

  /** Convenience getter for the provider slug. */
  public get adapter(): string {
    return this.InitAuthAdapter.adapter;
  }

  /**
   * Begin login. For oauth2 build the redirectUrl with state/PKCE; for bot flows
   * return `clientPayload` (deep-link / QR). Never creates a User.
   */
  public abstract start(ctx: StartContext): Promise<AuthStartResult>;

  /**
   * Verify a callback/webhook and return the verified, normalized profile.
   * MUST cryptographically verify (state, id_token signature, telegram/max hash, …).
   * Throws when the signature / nonce / freshness is invalid.
   */
  public abstract complete(input: AuthCompleteInput): Promise<NormalizedProfile>;

  /** (optional) health-check of the configured keys for the admin UI. */
  public async healthcheck(): Promise<{ ok: boolean; message?: string }> {
    return { ok: true };
  }

  /**
   * (optional) Handle a raw bot webhook update (Telegram/MAX). Return { stateId, profile }
   * when the update completes a pending login, else null to ignore it. `meta.headers` carries
   * the request headers so the adapter can authenticate the caller (e.g. Telegram's
   * `x-telegram-bot-api-secret-token`) — the update body itself is not signed.
   */
  public async handleWebhook?(
    update: Record<string, unknown>,
    meta?: WebhookMeta
  ): Promise<{ stateId: string; profile: NormalizedProfile } | null>;

  /** (optional) revoke / logout on the provider side. */
  public async revoke?(identity: AuthIdentityRecord): Promise<void>;
}
