import { v4 as uuid } from "uuid";
import { Adapter } from "../adapters";
import { NormalizedProfile } from "../adapters/auth/AuthProviderAdapter";
import { UserRecord, Phone } from "../models/User";
import { UserDeviceRecord } from "../models/UserDevice";
import { AuthProviderRecord } from "../models/AuthProvider";

export interface ResolveContext {
  deviceId: string;
  deviceName?: string;
  userAgent?: string;
  IP?: string;
  /** true if the phone in the profile was proven in THIS attempt via OTP (confirmAuthPhone) */
  confirmedByOtp?: boolean;
}

export type ResolveOutcome =
  | { status: "authorized"; user: UserRecord; userDevice: UserDeviceRecord }
  | { status: "awaiting_phone"; user?: UserRecord };

/**
 * Single point that turns a verified provider profile into a User + session.
 * Every provider funnels through here, so account-linking policy and session issuance
 * are single-sourced. The final step is always User.authDevice() — the SAME UserDevice +
 * sessionId + JWT that the phone login uses. Providers never build a parallel session mechanism.
 */
export class AuthService {
  private static async phoneToLogin(phone: Phone): Promise<string> {
    return await User.getPhoneString(phone, "login");
  }

  private static chooseSyntheticLogin(profile: NormalizedProfile): string {
    // Deterministic per (provider, externalId); the user can later migrate login to a phone.
    return `p:${profile.provider}:${profile.externalId}`;
  }

  private static async samePhone(a: Phone, b: Phone): Promise<boolean> {
    return (await User.getPhoneString(a, "login")) === (await User.getPhoneString(b, "login"));
  }

  /**
   * Decide whether a profile can proceed to authorization, or must first confirm a phone.
   * Rules (see auth.md §6.3 / §9):
   *  - phone counts as owned only if verified by the provider OR just confirmed by OTP;
   *  - if the provider config requires phone verification and we don't have a trusted phone,
   *    the caller must run the OTP flow (confirmAuthPhone) before we authorize;
   *  - one-click for returning accounts: the trust anchor is the (provider, externalId) identity,
   *    not the (spoofable) provider-supplied phone. Once a first OTP proved the phone behind an
   *    externalId, we bind AuthIdentity and skip the code on later logins of the SAME externalId —
   *    but only while the phone now presented still matches the bound one. A different phone means a
   *    number change and must be re-proven by OTP (we never trust a new phone silently).
   */
  static async needsPhoneConfirmation(profile: NormalizedProfile, providerConfig: AuthProviderRecord | undefined, ctx: ResolveContext): Promise<boolean> {
    const hasTrustedPhone = Boolean(
      profile.phone && (
        (profile.phoneVerifiedByProvider && providerConfig?.trustProviderPhone !== false) ||
        ctx.confirmedByOtp
      )
    );
    if (hasTrustedPhone) return false;
    if (!providerConfig?.requirePhoneVerification) return false;

    const identity = await AuthIdentity.findByExternal(profile.provider, profile.externalId);
    if (identity && identity.phone && profile.phone && (await this.samePhone(profile.phone as Phone, identity.phone as Phone))) {
      return false;
    }
    return true;
  }

  /**
   * Resolve (find or create + link) a User from a verified profile and issue a session.
   * Assumes any required phone confirmation already happened (call needsPhoneConfirmation first).
   */
  static async resolveFromProfile(profile: NormalizedProfile, ctx: ResolveContext): Promise<ResolveOutcome> {
    const providerConfig = await AuthProvider.getBySlug(profile.provider);
    const hasVerifiedPhone = Boolean(
      profile.phone && (
        (profile.phoneVerifiedByProvider && providerConfig?.trustProviderPhone !== false) ||
        ctx.confirmedByOtp
      )
    );

    // 1) Repeat login — identity already exists.
    let identity = await AuthIdentity.findByExternal(profile.provider, profile.externalId);
    let user: UserRecord | undefined;

    if (identity) {
      user = await User.findOne({ id: identity.user as string });
      if (user) {
        await AuthIdentity.updateOne({ id: identity.id }, {
          email: profile.email ?? identity.email,
          phone: (profile.phone as Phone) ?? identity.phone,
          displayName: [profile.firstName, profile.lastName].filter(Boolean).join(" ") || identity.displayName,
          avatarUrl: profile.avatarUrl ?? identity.avatarUrl,
          lastLoginAt: Date.now(),
        });
      } else {
        // Dangling identity (user was deleted) — recreate below.
        identity = undefined;
      }
    }

    // 2) No identity yet — try to link to an existing user by a VERIFIED contact only.
    if (!user) {
      if (hasVerifiedPhone && profile.phone) {
        const login = await this.phoneToLogin(profile.phone as Phone);
        user = await User.findOne({ login });
      }
      if (!user && profile.email && profile.emailVerifiedByProvider) {
        user = await User.findOne({ email: profile.email });
      }

      // 3) Still nothing — create a new user.
      if (!user) {
        const login = hasVerifiedPhone && profile.phone
          ? await this.phoneToLogin(profile.phone as Phone)
          : this.chooseSyntheticLogin(profile);

        user = await User.create({
          login,
          ...(profile.phone ? { phone: profile.phone as Phone } : {}),
          ...(profile.email ? { email: profile.email } : {}),
          ...(profile.firstName ? { firstName: profile.firstName } : {}),
          ...(profile.lastName ? { lastName: profile.lastName } : {}),
          verified: hasVerifiedPhone,
          emailVerified: Boolean(profile.email && profile.emailVerifiedByProvider),
        }).fetch();
      } else if (hasVerifiedPhone && !user.verified) {
        // Linking a verified phone to an existing account.
        user = await User.updateOne({ id: user.id }, { verified: true });
      }

      // Create the identity link.
      await AuthIdentity.create({
        provider: profile.provider,
        externalId: profile.externalId,
        user: user.id,
        email: profile.email,
        phone: profile.phone as Phone,
        displayName: [profile.firstName, profile.lastName].filter(Boolean).join(" ") || undefined,
        avatarUrl: profile.avatarUrl,
        lastLoginAt: Date.now(),
      }).fetch();
    }

    // 4) Issue the session — reuse the SAME mechanism as phone login.
    const userDevice = await User.authDevice(
      user.id,
      ctx.deviceId,
      ctx.deviceName ?? "AUTH PROVIDER",
      ctx.userAgent ?? "",
      ctx.IP ?? ""
    );

    return { status: "authorized", user, userDevice };
  }

  /**
   * Unlink a provider — or one specific external account of it — from a user, and let the adapter
   * clean up its own side (recipient rows, provider-side session) via `revoke()`. Domain logic lives
   * here so every entry point (GraphQL, admin, account deletion) unlinks identically; callers only
   * handle transport/response. Provider-side cleanup is best-effort: the core link is removed first,
   * so a `revoke` failure must not fail the unlink. Returns the number of identities removed.
   */
  static async unlink(userId: string, provider: string, externalId?: string): Promise<number> {
    const criteria: { provider: string; user: string; externalId?: string } = { provider, user: userId };
    if (externalId) criteria.externalId = externalId;

    // Read the identities before deleting so the adapter can clean up its own side per identity.
    const identities = await AuthIdentity.find(criteria);
    await AuthIdentity.destroy(criteria);

    try {
      const adapter = await Adapter.getAuthAdapter(provider);
      if (typeof adapter.revoke === "function") {
        for (const identity of identities) await adapter.revoke(identity);
      }
    } catch (e) {
      sails.log.error(`AuthService.unlink revoke [${provider}]`, e);
    }
    return identities.length;
  }
}

export default AuthService;
