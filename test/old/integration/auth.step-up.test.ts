import { expect } from "chai";
import AuthService from "../../lib/AuthService";
import AuthAdapter, { NormalizedProfile, StartResult } from "../../adapters/auth/AuthAdapter";
import { AuthAttemptRecord } from "../../models/AuthAttempt";
import { CoreOtpAdapter } from "../../adapters/auth/core/CoreOtpAdapter";
import { NotificationService } from "../../lib/notifications/NotificationService";

/**
 * Auth v2 — step-up is bound to the account, not to what the client typed (review2 §1.2).
 *
 * `verify:delete_account`, `verify:unlink_identity` and `verify:link_identity` guard operations
 * that only the owner may perform, and the ticket they mint is checked by `consumeTicket` on
 * purpose + userId + deviceId — every one of which somebody holding a stolen session already
 * has. So if the number being proven could be named by the caller, the step-up proved nothing
 * about the account: the attacker sends the code to their own phone and deletes the account, or
 * unlinks the owner's way in. The target has to come from the server.
 *
 * Kept in its own file rather than in auth.test.ts: separate registry slugs, and one suite
 * per concern.
 */

/** A messenger-style provider whose profile is the answer: no phone, so it proves an identity only. */
class StepUpProvider extends AuthAdapter {
  constructor() {
    super({
      adapter: "stepupsocial",
      title: "Step-up social",
      sortOrder: 1,
      requirePhoneVerification: false,
      offers: [{ kind: "identity", offer: "oauth", flow: "oauth2" }],
    });
  }
  public async start(attempt: AuthAttemptRecord): Promise<StartResult> {
    return { redirectUrl: `https://stepup.example.com/authorize?state=${attempt.id}`, ttlSec: 300 };
  }
}

describe("Auth v2 step-up binding", function () {
  this.timeout(30000);

  const OWNER_PHONE = "79995558001";
  const ATTACKER_PHONE = "79995558002";
  const VICTIM_DEVICE = "step-up-owner-device";
  const ATTACKER_DEVICE = "step-up-attacker-device";

  let ownerId: string;
  let realEmit: typeof NotificationService.emit;

  before(async function () {
    await Settings.set("AUTH_MAX_PHONE_IDENTITIES", { key: "AUTH_MAX_PHONE_IDENTITIES", value: 1 });
    await Settings.set("AUTH_SEND_MAX_PER_TARGET_HOUR", { key: "AUTH_SEND_MAX_PER_TARGET_HOUR", value: 50 });
    await Settings.set("AUTH_SEND_MAX_PER_TARGET_DAY", { key: "AUTH_SEND_MAX_PER_TARGET_DAY", value: 50 });
    await Settings.set("OTP_RESEND_INTERVAL_SECONDS", { key: "OTP_RESEND_INTERVAL_SECONDS", value: 0 });

    if (!AuthMethod.getAdapter("core", "sms")) await new CoreOtpAdapter().wait();
    if (!AuthMethod.getAdapter("stepupsocial", "oauth")) await new StepUpProvider().wait();
    await AuthMethod.updateOne({ adapter: "core", offer: "sms" }, { enable: true, healthStatus: "ready", sortOrder: 100 });
    // An identity row is not allowed near a step-up by default (`defaultPurposes`); an operator
    // who wants "confirm it in the messenger" has to say so on the row. Said here, because the
    // ownership rule this suite checks only has anything to guard once it is.
    await AuthMethod.updateOne({ adapter: "stepupsocial", offer: "oauth" }, {
      enable: true,
      healthStatus: "ready",
      sortOrder: 700,
      purposes: ["login", "link", "verify:delete_account", "verify:link_identity", "verify:unlink_identity"],
    });

    // No sms channel in the repository, so the pipeline would report "nothing sent" and the
    // adapter would (correctly) fail the attempt. The cases here are about the target, not
    // about delivery.
    realEmit = NotificationService.emit;
    NotificationService.emit = (async () => [{ typeKey: "user_otp_sms", status: "sent" }] as any) as any;

    const account = await AuthService.materializeUser({
      phone: { code: "7", number: "9995558001" },
      firstName: "Step-up owner",
      proof: { at: Date.now(), method: "sms", adapter: "core", purpose: "login" },
    });
    ownerId = account.user.id as string;
  });

  after(function () {
    if (realEmit) NotificationService.emit = realEmit;
  });

  it("a self-proven number does not open the account's doors", async function () {
    // The whole attack in one call: a live JWT for the account (its userId), a device the
    // attacker holds, and the attacker's own number as `login`.
    const attempt = await AuthService.start({
      purpose: "verify:delete_account",
      login: ATTACKER_PHONE,
      user: ownerId,
      deviceId: ATTACKER_DEVICE,
    });

    expect(attempt.target, "the code must go to the account's own number").to.equal(OWNER_PHONE);
    expect(attempt.target).to.not.equal(ATTACKER_PHONE);
    // And no screen asking which number to prove.
    expect(attempt.step.type).to.equal("enter_code");
  });

  it("the same binding applies to unlink and to link_identity", async function () {
    for (const purpose of ["verify:unlink_identity", "verify:link_identity"]) {
      const attempt = await AuthService.start({
        purpose,
        login: ATTACKER_PHONE,
        user: ownerId,
        deviceId: ATTACKER_DEVICE,
      });
      expect(attempt.target, `${purpose} must be bound to the incumbent`).to.equal(OWNER_PHONE);
    }
  });

  it("proving the incumbent number still mints a ticket", async function () {
    const attempt = await AuthService.start({
      purpose: "verify:delete_account",
      user: ownerId,
      deviceId: VICTIM_DEVICE,
    });
    const code = String((await AuthAttempt.findOne({ id: attempt.id })).secret);
    const done = await AuthService.submit(attempt.id as string, attempt.step.id, code, { deviceId: VICTIM_DEVICE });

    expect(done.status).to.equal("done");
    expect(done.ticket).to.be.a("string");
    const consumed = await AuthService.consumeTicket(done.ticket as string, "verify:delete_account", VICTIM_DEVICE);
    expect(consumed?.userId).to.equal(ownerId);
  });

  it("`verify:phone` is still about a new number", async function () {
    // The counter-case: this purpose exists precisely to prove a number the account does not
    // have yet, so the client naming it is correct here and must not have been broken.
    const attempt = await AuthService.start({
      purpose: "verify:phone",
      login: "79995558003",
      user: ownerId,
      deviceId: VICTIM_DEVICE,
    });
    expect(attempt.target).to.equal("79995558003");
  });

  it("an account with no proven way in cannot step up at all", async function () {
    // A phone on the User row and no AuthIdentity behind it: the projection is not the record
    // of who owns the account, the identity set is.
    const stranger = await User.create({ firstName: "No identities", phone: { code: "7", number: "9995558009" } } as any).fetch();

    let thrown: any = null;
    try {
      await AuthService.start({
        purpose: "verify:delete_account",
        login: ATTACKER_PHONE,
        user: stranger.id as string,
        deviceId: ATTACKER_DEVICE,
      });
    } catch (e) {
      thrown = e;
    }
    expect(thrown).to.equal("no_incumbent");
  });

  it("a provider profile that is not the account's own identity does not finish a step-up", async function () {
    const attempt = await AuthService.start({
      purpose: "verify:unlink_identity",
      method: "stepupsocial:oauth",
      user: ownerId,
      deviceId: ATTACKER_DEVICE,
    });
    expect(attempt.step.type).to.equal("redirect");

    const foreign: NormalizedProfile = {
      provider: "stepupsocial",
      externalId: "attackers-own-account",
      firstName: "Attacker",
    } as NormalizedProfile;
    const after = await AuthService.acceptProfile(attempt, foreign, { deviceId: ATTACKER_DEVICE });

    expect(after.status).to.equal("failed");
    expect(after.failReason).to.equal("no_incumbent");
    expect(after.ticket).to.be.oneOf([null, undefined]);
  });

  it("the account's own proven identity falls back to proving the number on record", async function () {
    await AuthIdentity.create({
      provider: "stepupsocial",
      externalId: "owners-own-account",
      user: ownerId,
      proof: { at: Date.now(), method: "oauth", adapter: "stepupsocial", purpose: "login" },
      linkedAt: Date.now(),
    }).fetch();

    const attempt = await AuthService.start({
      purpose: "verify:unlink_identity",
      method: "stepupsocial:oauth",
      user: ownerId,
      deviceId: VICTIM_DEVICE,
    });

    const own: NormalizedProfile = {
      provider: "stepupsocial",
      externalId: "owners-own-account",
      firstName: "Step-up owner",
    } as NormalizedProfile;
    const after = await AuthService.acceptProfile(attempt, own, { deviceId: VICTIM_DEVICE });

    // This provider vouches for no phone, so the attempt moves on to proving one — and the one
    // it proves is still the account's, never a number the profile or the client supplied.
    expect(after.status).to.not.equal("failed");
    expect(after.target).to.equal(OWNER_PHONE);
  });
});
