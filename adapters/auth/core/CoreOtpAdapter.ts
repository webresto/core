import AuthAdapter, { Offer, StartResult } from "../AuthAdapter";
import { AuthAttemptRecord } from "../../../models/AuthAttempt";
import { NotificationService } from "../../../lib/notifications/NotificationService";

/**
 * The core's own phone_proof capability: "we invent a 6-digit code and put it in a message".
 *
 * It exists as a registry row like any other (design2 §4.1) precisely so that the baseline is not
 * a special case. "No provider configured, fall back to notifications" is not an empty-chain
 * escape hatch in AuthService — it is the row `core/sms`, and it competes for `sortOrder` with
 * `smsc/sms` on equal terms.
 *
 * The only login string the core proves is a phone number. An email-code offer used to live here
 * too, but nothing ever delivered it: the seeded rule `user_otp_sms` is `fixedChannels: ["sms"]`
 * and the core has no email channel, so the row could only ever end in `send_failed` (review3
 * §1.2). Email as a way IN belongs to a module that owns an email channel and registers its own
 * `identity` row with flow `email_link`; `User.email` here stays a profile attribute.
 *
 * Delivery goes through the typed-notification pipeline (`user_otp_requested` →
 * NotificationRules), i.e. through the operator's own channel configuration — this adapter is a
 * real message, so it belongs there. Flash-call and dial-in do NOT (design2 §7.4).
 */
export class CoreOtpAdapter extends AuthAdapter {
  constructor() {
    super({
      adapter: "core",
      title: "SMS",
      providerModule: "restocore",
      // Free at this layer: the actual SMS cost lives with whatever channel the notification
      // pipeline picks, and `cost` here only orders the method list.
      cost: 0,
      sortOrder: 100,
      // A registry row like any other — but not a third-party one. DEFAULT_ENABLE_AUTH_PROVIDERS
      // is about providers the operator has to configure first; the baseline has nothing to
      // configure, and an installation where it starts disabled is one where nobody can sign in
      // until somebody notices (review2 §1.1).
      enabledByDefault: true,
      offers: [
        { kind: "phone_proof", offer: "sms", mode: "enter_code", secretOrigin: "server", codeLength: 6 },
      ],
    });
  }

  /**
   * Hand the already-generated `attempt.secret` to the notification pipeline. Called by
   * AuthService only after it won the sentAt CAS, so this runs once per delivery.
   *
   * Throwing matters: AuthService rolls the CAS back on an exception and surfaces
   * `failReason: send_failed`, so a dead SMS gateway shows up as a failure the user can act on
   * instead of an attempt stuck at "code sent" forever (design2 Д13, И8).
   */
  public async start(attempt: AuthAttemptRecord, offer: Offer): Promise<StartResult> {
    const target = String(attempt.target ?? "");
    if (!target) throw `core/${offer.offer}: attempt has no target to deliver to`;

    const ttlSec = Number((await Settings.get("OTP_TTL_SECONDS")) || 1800);
    const user = attempt.user
      ? await User.findOne({ id: typeof attempt.user === "string" ? attempt.user : attempt.user.id })
      : undefined;

    const results = await NotificationService.emit("user_otp_requested", {
      recipient: user ? { userId: user.id as string, user } : {},
      context: {
        user: user
          ? {
              firstName: user.firstName,
              lastName: user.lastName,
              phone: user.phone ? `${(user.phone as any).code ?? ""}${(user.phone as any).number ?? ""}` : target,
              email: user.email,
            }
          // No User row yet — first login, or a guest. Phone-capable channels read the number
          // straight off the context, which is why the attempt target is enough here.
          : { phone: target },
        otp: { code: attempt.secret as string, ttlSec },
      },
      groupTo: "user",
      // One key per attempt+delivery: a resend is a new message, and marking the previous one
      // read must not silently swallow the new one.
      meta: { sourceModule: "core/auth", idempotencyKey: `auth_attempt:${attempt.id}:${Number(attempt.resends ?? 0)}` },
    });

    // `emit` never throws for "nobody was there to send it": a disabled rule is an empty list, a
    // channel that is not registered is a notification finished as `failed`. Both are the
    // operator's configuration rather than the gateway — and exactly what an upgrade produces —
    // so they have to surface the same way a dead gateway does, or the user sits on `enter_code`
    // waiting for a message that was never going to leave (review2 §1.1).
    const delivered = (results ?? []).some((entry) => entry.status === "sent" || entry.status === "scheduled");
    if (!delivered) {
      const why = results?.length
        ? results.map((entry) => `${entry.typeKey}: ${entry.notificationStatus ?? entry.reason ?? entry.status}`).join("; ")
        : "no enabled notification rule for user_otp_requested";
      throw `core/${offer.offer}: nothing delivered (${why})`;
    }

    return { ttlSec };
  }
}

export default CoreOtpAdapter;
