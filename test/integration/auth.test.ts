import { expect } from "chai";
import AuthService from "../../lib/AuthService";
import { CoreOtpAdapter } from "../../adapters/auth/core/CoreOtpAdapter";
import AuthAdapter, { NormalizedProfile, Offer, StartResult } from "../../adapters/auth/AuthAdapter";
import { AuthAttemptRecord } from "../../models/AuthAttempt";
import { NotificationService } from "../../lib/notifications/NotificationService";
import { resolveRedirectBack } from "../../lib/authRedirect";
import getEmitter from "../../lib/getEmitter";

/**
 * The auth v2 cycle, end to end against real models
 * (.ai-notes/auth/design2.md, .ai-notes/auth/extend_user_account.md).
 *
 * The invariants asserted here are the ones the design documents name explicitly, because each
 * one is a thing that was wrong before and would be silently wrong again if it regressed.
 */

/** A flash-call provider: the code is the tail of the number that calls, and nothing is sent. */
class FakeFlashCall extends AuthAdapter {
  constructor() {
    super({
      adapter: "testflash",
      title: "Flash call",
      cost: 1,
      sortOrder: 1,
      offers: [{ kind: "phone_proof", offer: "flashcall", mode: "enter_code", secretOrigin: "provider", codeLength: 4 }],
    });
  }
  public async start(): Promise<StartResult> {
    return { callerNumber: "74951234567", extract: { anchor: "tail", offset: 0, length: 4 }, ttlSec: 60 };
  }
}

/** The same flash-call, but the number that will call is still on its way by webhook. */
class FakeDeferredFlashCall extends AuthAdapter {
  constructor() {
    super({
      adapter: "testdeferred",
      title: "Deferred flash call",
      cost: 1,
      sortOrder: 1,
      offers: [{ kind: "phone_proof", offer: "flashcall", mode: "enter_code", secretOrigin: "provider", codeLength: 4 }],
    });
  }
  public async start(): Promise<StartResult> {
    return { deferred: true, ttlSec: 60 };
  }
}

/** A flash-call whose next call comes from a different number — i.e. carries a different code. */
class FakeRotatingFlashCall extends AuthAdapter {
  constructor() {
    super({
      adapter: "testrotate",
      title: "Rotating flash call",
      cost: 1,
      sortOrder: 1,
      offers: [{ kind: "phone_proof", offer: "flashcall", mode: "enter_code", secretOrigin: "provider", codeLength: 4 }],
    });
  }
  public calls = 0;
  public async start(): Promise<StartResult> {
    this.calls += 1;
    return { callerNumber: `749512300${String(this.calls).padStart(2, "0")}`, extract: { anchor: "tail", offset: 0, length: 4 }, ttlSec: 60 };
  }
}

/** A provider that is down: the call is attempted and throws, which is the expensive kind of no. */
class FakeBrokenFlashCall extends AuthAdapter {
  constructor() {
    super({
      adapter: "testbroken",
      title: "Broken flash call",
      cost: 1,
      sortOrder: 1,
      offers: [{ kind: "phone_proof", offer: "flashcall", mode: "enter_code", secretOrigin: "provider", codeLength: 4 }],
    });
  }
  public async start(): Promise<StartResult> {
    throw `the flash-call gateway is down`;
  }
}

/** Dial-in: we lease a number, the user calls it, the ANI that arrives is the proof. */
class FakeDialIn extends AuthAdapter {
  constructor() {
    super({
      adapter: "testdialin",
      title: "Dial in",
      cost: 1,
      sortOrder: 1,
      offers: [{ kind: "phone_proof", offer: "dialin", mode: "dial_number", secretOrigin: "none" }],
    });
  }
  /** Numbers handed back through cancel() — the lease pool this fake would otherwise run dry. */
  public released: string[] = [];
  /** A DNIS of its own per attempt — that number is how the ANI signal finds this attempt back. */
  public async start(attempt: AuthAttemptRecord): Promise<StartResult> {
    return { providerRef: `7495${String(attempt.target).slice(-6)}`, dialNumber: `7495${String(attempt.target).slice(-6)}`, ttlSec: 120 };
  }
  public async cancel(attempt: AuthAttemptRecord): Promise<void> {
    this.released.push(String(attempt.providerRef));
  }
}

/** A provider that vouches for numbers (bot contact), with the operator's SMS gate switched off. */
class FakeVouching extends AuthAdapter {
  constructor() {
    super({
      adapter: "testvouch",
      title: "Vouching",
      sortOrder: 1,
      requirePhoneVerification: false,
      offers: [{ kind: "identity", offer: "oauth", flow: "oauth2", canVerifyPhone: true }],
    });
  }
  public async start(attempt: AuthAttemptRecord): Promise<StartResult> {
    return { redirectUrl: `https://vouch.example.com/authorize?state=${attempt.id}`, ttlSec: 300 };
  }
}

/** A social provider that does not vouch for a number: its profile lands on a phone-proof step. */
class FakeSocial extends AuthAdapter {
  constructor() {
    super({
      adapter: "testsocial",
      title: "Social",
      sortOrder: 1,
      requirePhoneVerification: true,
      offers: [{ kind: "identity", offer: "oauth", flow: "oauth2" }],
    });
  }
  public async start(attempt: AuthAttemptRecord): Promise<StartResult> {
    return { redirectUrl: `https://social.example.com/authorize?state=${attempt.id}`, ttlSec: 300 };
  }
}

describe("Auth v2", function () {
  this.timeout(30000);

  const DEV = "auth-test-device";
  let emitted: { event: string; payload: any }[] = [];
  let realEmit: typeof NotificationService.emit;

  /** The code never leaves the server, so a test reads it where the server keeps it. */
  async function secretOf(attemptId: string): Promise<string> {
    return String((await AuthAttempt.findOne({ id: attemptId })).secret);
  }

  async function enable(adapter: string, offer: string) {
    await AuthMethod.updateOne({ adapter, offer }, { enable: true, healthStatus: "ready" });
  }

  before(async function () {
    await Settings.set("OTP_MAX_ATTEMPTS", { key: "OTP_MAX_ATTEMPTS", value: 5 });
    await Settings.set("OTP_RESEND_INTERVAL_SECONDS", { key: "OTP_RESEND_INTERVAL_SECONDS", value: 60 });
    await Settings.set("AUTH_MAX_PHONE_IDENTITIES", { key: "AUTH_MAX_PHONE_IDENTITIES", value: 1 });
    await Settings.set("AUTH_MAX_IDENTITIES_PER_ADAPTER", { key: "AUTH_MAX_IDENTITIES_PER_ADAPTER", value: 1 });
    await Settings.set("AUTH_ALLOW_PHONE_CHANGE", { key: "AUTH_ALLOW_PHONE_CHANGE", type: "boolean", value: false });
    await Settings.set("AUTH_LINK_NOTICE_POLICY", { key: "AUTH_LINK_NOTICE_POLICY", value: "notify" });
    await Settings.set("ALLOW_USER_WITHOUT_PHONE", { key: "ALLOW_USER_WITHOUT_PHONE", type: "boolean", value: false });
    await Settings.set("AUTH_MAX_SWITCHES", { key: "AUTH_MAX_SWITCHES", value: 3 });
    await Settings.set("AUTH_SEND_MAX_PER_TARGET_HOUR", { key: "AUTH_SEND_MAX_PER_TARGET_HOUR", value: 5 });
    await Settings.set("AUTH_SEND_MAX_PER_TARGET_DAY", { key: "AUTH_SEND_MAX_PER_TARGET_DAY", value: 15 });

    // The core adapter registers itself from afterHook; only construct one if that did not run.
    // Constructing a second instance would (correctly) be treated as a slug conflict.
    if (!AuthMethod.getAdapter("core", "sms")) await new CoreOtpAdapter().wait();
    if (!AuthMethod.getAdapter("testflash", "flashcall")) await new FakeFlashCall().wait();
    if (!AuthMethod.getAdapter("testdeferred", "flashcall")) await new FakeDeferredFlashCall().wait();
    if (!AuthMethod.getAdapter("testrotate", "flashcall")) await new FakeRotatingFlashCall().wait();
    if (!AuthMethod.getAdapter("testbroken", "flashcall")) await new FakeBrokenFlashCall().wait();
    if (!AuthMethod.getAdapter("testdialin", "dialin")) await new FakeDialIn().wait();
    if (!AuthMethod.getAdapter("testsocial", "oauth")) await new FakeSocial().wait();
    if (!AuthMethod.getAdapter("testvouch", "oauth")) await new FakeVouching().wait();
    await enable("core", "sms");
    await enable("testvouch", "oauth");
    await enable("testflash", "flashcall");
    await enable("testdeferred", "flashcall");
    await enable("testrotate", "flashcall");
    await enable("testbroken", "flashcall");
    await enable("testdialin", "dialin");
    await enable("testsocial", "oauth");
    await AuthMethod.updateOne({ adapter: "core", offer: "sms" }, { sortOrder: 100 });
    await AuthMethod.updateOne({ adapter: "testflash", offer: "flashcall" }, { sortOrder: 200 });
    // Behind core:sms in the operator's order, so nothing above picks one of them by accident.
    await AuthMethod.updateOne({ adapter: "testdeferred", offer: "flashcall" }, { sortOrder: 300 });
    await AuthMethod.updateOne({ adapter: "testdialin", offer: "dialin" }, { sortOrder: 400 });
    // Named explicitly by the tests that want them, never picked as anybody's first choice.
    await AuthMethod.updateOne({ adapter: "testrotate", offer: "flashcall" }, { sortOrder: 410 });
    await AuthMethod.updateOne({ adapter: "testbroken", offer: "flashcall" }, { sortOrder: 420 });
    await AuthMethod.updateOne({ adapter: "testsocial", offer: "oauth" }, { sortOrder: 500, requirePhoneVerification: true });
    await AuthMethod.updateOne({ adapter: "testvouch", offer: "oauth" }, { sortOrder: 600, requirePhoneVerification: false });

    realEmit = NotificationService.emit;
    NotificationService.emit = (async (event: string, payload: any) => {
      emitted.push({ event, payload });
      // What a delivered message looks like from the adapter's side: `CoreOtpAdapter.start`
      // treats an empty list (no enabled rule) or a failed notification (no channel) as
      // send_failed, so the stub has to say it went out.
      return [{ typeKey: "user_otp_sms", status: "sent" }] as any;
    }) as any;
  });

  after(function () {
    if (realEmit) NotificationService.emit = realEmit;
  });

  beforeEach(function () {
    emitted = [];
  });

  describe("phone login", function () {
    it("delivers a code through the notification pipeline and finishes on the right one", async function () {
      const attempt = await AuthService.start({ purpose: "login", login: "79995551001", deviceId: DEV });

      expect(attempt.step.type).to.equal("enter_code");
      // The field length is a property of the method, not a constant: flash-call is 4, SMS is 6.
      expect(attempt.step.codeLength).to.equal(6);
      expect(emitted.filter((e) => e.event === "user_otp_requested")).to.have.length(1);

      const code = await secretOf(attempt.id as string);
      expect(code).to.match(/^\d{6}$/);

      const done = await AuthService.submit(attempt.id as string, attempt.step.id, code, { deviceId: DEV });
      expect(done.status).to.equal("done");
      expect(done.ticket).to.be.a("string");
    });

    it("a code nobody could send is send_failed, not a form waiting for it", async function () {
      // A disabled rule is an empty list from emit; an unregistered channel is a notification
      // finished as `failed`. Neither throws on its own — the adapter has to (review2 §1.1),
      // otherwise sentAt is written and the user waits for a message that never left.
      const capture = NotificationService.emit;
      try {
        NotificationService.emit = (async () => [] as any[]) as any;
        const silent = await AuthService.start({ purpose: "login", login: "79995551091", deviceId: DEV });
        expect(silent.failReason).to.equal("send_failed");
        expect((await AuthAttempt.findOne({ id: silent.id })).sentAt).to.be.oneOf([null, undefined]);

        NotificationService.emit = (async () => [{ typeKey: "user_otp_sms", status: "skipped", notificationStatus: "failed" }]) as any;
        const dead = await AuthService.start({ purpose: "login", login: "79995551092", deviceId: DEV });
        expect(dead.failReason).to.equal("send_failed");
      } finally {
        NotificationService.emit = capture;
      }
    });

    it("makes the phone an identity, and User.verified a projection of its proof", async function () {
      const attempt = await AuthService.start({ purpose: "login", login: "79995551002", deviceId: DEV });
      await AuthService.submit(attempt.id as string, attempt.step.id, await secretOf(attempt.id as string), { deviceId: DEV });

      const identity = await AuthIdentity.findByExternal("phone", "79995551002");
      expect(identity).to.exist;
      // Not a boolean: "proven by SMS" and "proven by a call" have different strength (И3).
      expect((identity.proof as any).method).to.equal("sms");

      const user = await User.findOne({ id: identity.user as string });
      expect(user.verified).to.equal(true);
      expect(user.primaryPhone).to.equal(identity.id);
      // Kept as the denormalized copy external bonus/RMS adapters read.
      expect(user.phone).to.deep.equal({ code: "7", number: "9995551002" });
    });

    it("never exposes the secret in the client view", async function () {
      const attempt = await AuthService.start({ purpose: "login", login: "79995551003", deviceId: DEV });
      const view = await AuthService.view(attempt, DEV);
      expect(JSON.stringify(view)).to.not.contain(await secretOf(attempt.id as string));
      expect(view.phoneHint).to.equal("+7 ••• ••• 10-03");
    });
  });

  describe("step versioning (И7)", function () {
    it("answers a stale step with 'refresh the screen', not 'wrong code'", async function () {
      const attempt = await AuthService.start({ purpose: "login", login: "79995551004", deviceId: DEV });
      const code = await secretOf(attempt.id as string);

      const stale = await AuthService.submit(attempt.id as string, "a-step-id-from-another-life", code, { deviceId: DEV });
      expect(stale.failReason).to.equal("stale_step");
      expect(stale.status).to.not.equal("done");
    });

    it("switching method regenerates the step and kills the previous secret", async function () {
      const attempt = await AuthService.start({ purpose: "login", method: "testflash:flashcall", login: "79995551005", deviceId: DEV });
      const flashSecret = await secretOf(attempt.id as string);

      const switched = await AuthService.switchMethod(attempt.id as string, DEV, "core:sms");
      expect(switched.step.id).to.not.equal(attempt.step.id);
      expect(switched.step.codeLength).to.equal(6);
      // Carried over on purpose: SMS → flash-call → SMS would otherwise walk round the antiflood.
      expect(Number(switched.switches)).to.equal(1);

      const reused = await AuthService.submit(switched.id as string, switched.step.id, flashSecret, { deviceId: DEV });
      expect(reused.failReason).to.equal("wrong_code");
    });
  });

  describe("brute force and flooding", function () {
    it("destroys the secret once the guess budget is spent", async function () {
      const attempt = await AuthService.start({ purpose: "login", login: "79995551006", deviceId: DEV });
      let last: any;
      for (let i = 0; i < 5; i++) {
        last = await AuthService.submit(attempt.id as string, attempt.step.id, "000000", { deviceId: DEV });
      }
      expect(last.failReason).to.equal("code_locked");
      // Destroyed, not merely refused — a short code left alive is a short code still guessable.
      expect(last.secret).to.be.oneOf([null, undefined]);
    });

    it("claims the send once, however many clients ask (И8)", async function () {
      const attempt = await AuthService.start({ purpose: "login", login: "79995551007", deviceId: DEV });
      const before = emitted.filter((e) => e.event === "user_otp_requested").length;

      await Promise.all([
        AuthService.claimAndSend(attempt.id as string),
        AuthService.claimAndSend(attempt.id as string),
        AuthService.claimAndSend(attempt.id as string),
      ]);
      expect(emitted.filter((e) => e.event === "user_otp_requested")).to.have.length(before);
    });

    it("budgets code issuance per login, across attempts (И6)", async function () {
      await AuthService.start({ purpose: "login", login: "79995551008", deviceId: "device-a" });
      expect(emitted.filter((e) => e.event === "user_otp_requested")).to.have.length(1);

      // A second attempt from another device must not buy a second SMS for the same number.
      const second = await AuthService.start({ purpose: "login", login: "79995551008", deviceId: "device-b" });
      expect(emitted.filter((e) => e.event === "user_otp_requested")).to.have.length(1);
      expect(second.failReason).to.equal("rate_limited");
    });
  });

  /**
   * The switch path used to be free: the counter was written and never read, and the new step
   * nulled `sentAt` — the field the antiflood was computed from. `authSwitch(id, "core:sms")` in
   * a loop was therefore an unmetered SMS pump aimed at any number, after one solved captcha
   * (review1 §1.2). Every assertion here is one of the three things that closed it.
   */
  describe("authSwitch is not an SMS pump (review1 §1.2)", function () {
    /** Everything ever aimed at this number, whatever method paid for it. */
    async function delivered(target: string): Promise<number> {
      return await AuthSendLog.countSince(target, 0);
    }

    it("stops re-aiming the attempt once the switch budget is spent", async function () {
      await Settings.set("AUTH_MAX_SWITCHES", { key: "AUTH_MAX_SWITCHES", value: 2 });
      const target = "79995551020";
      const attempt = await AuthService.start({ purpose: "login", method: "testflash:flashcall", login: target, deviceId: DEV });

      const first = await AuthService.switchMethod(attempt.id as string, DEV, "core:sms");
      expect(first.failReason).to.be.oneOf([null, undefined]);
      const second = await AuthService.switchMethod(attempt.id as string, DEV, "testflash:flashcall");
      expect(second.failReason).to.be.oneOf([null, undefined]);

      const refused = await AuthService.switchMethod(attempt.id as string, DEV, "core:sms");
      expect(refused.failReason).to.equal("switch_limit");
      // Three deliveries in total: the attempt itself and its two switches — and no fourth.
      expect(await delivered(target)).to.equal(3);

      await Settings.set("AUTH_MAX_SWITCHES", { key: "AUTH_MAX_SWITCHES", value: 3 });
    });

    it("treats a 'switch' to the method already in charge as a no-op", async function () {
      const target = "79995551021";
      const attempt = await AuthService.start({ purpose: "login", login: target, deviceId: DEV });
      const code = await secretOf(attempt.id as string);

      const same = await AuthService.switchMethod(attempt.id as string, DEV, "core:sms");
      // Re-picking the current method must not mint a fresh secret or buy a second SMS.
      expect(same.step.id).to.equal(attempt.step.id);
      expect(await secretOf(attempt.id as string)).to.equal(code);
      expect(await delivered(target)).to.equal(1);
    });

    it("counts every delivery against the target's cap, whichever method made it", async function () {
      await Settings.set("AUTH_SEND_MAX_PER_TARGET_HOUR", { key: "AUTH_SEND_MAX_PER_TARGET_HOUR", value: 2 });
      await Settings.set("AUTH_MAX_SWITCHES", { key: "AUTH_MAX_SWITCHES", value: 10 });
      const target = "79995551022";

      const attempt = await AuthService.start({ purpose: "login", login: target, deviceId: DEV });
      await AuthService.switchMethod(attempt.id as string, DEV, "testflash:flashcall");
      const capped = await AuthService.switchMethod(attempt.id as string, DEV, "core:sms");

      // The pause is skippable by a switch on purpose ("the call never came, text me instead");
      // the cap is not, which is what keeps the switch path finite.
      expect(capped.failReason).to.equal("rate_limited");
      expect(await delivered(target)).to.equal(2);

      await Settings.set("AUTH_SEND_MAX_PER_TARGET_HOUR", { key: "AUTH_SEND_MAX_PER_TARGET_HOUR", value: 5 });
      await Settings.set("AUTH_MAX_SWITCHES", { key: "AUTH_MAX_SWITCHES", value: 3 });
    });

    it("keeps the antiflood clock a switch away from being reset", async function () {
      const target = "79995551023";
      const attempt = await AuthService.start({ purpose: "login", login: target, deviceId: DEV });
      await AuthService.switchMethod(attempt.id as string, DEV, "testflash:flashcall");

      // A fresh attempt (new device, no counters) still sees the target's own history: the
      // budget lives in AuthSendLog, which no step rebuild can erase.
      const fresh = await AuthService.start({ purpose: "login", login: target, deviceId: "device-c" });
      expect(fresh.failReason).to.equal("rate_limited");
      expect(await delivered(target)).to.equal(2);
    });

    it("does not spend a switch on a refusal (review2 §2.6)", async function () {
      await Settings.set("AUTH_SEND_MAX_PER_TARGET_HOUR", { key: "AUTH_SEND_MAX_PER_TARGET_HOUR", value: 1 });
      await Settings.set("AUTH_MAX_SWITCHES", { key: "AUTH_MAX_SWITCHES", value: 1 });
      const target = "79995551100";
      try {
        // The one send the cap allows is the attempt's own.
        const attempt = await AuthService.start({ purpose: "login", login: target, deviceId: DEV });

        const refused = await AuthService.switchMethod(attempt.id as string, DEV, "testflash:flashcall");
        expect(refused.failReason).to.equal("rate_limited");
        // Nothing was re-aimed: the previous method is still in charge, and the switch counter
        // says so. Counting it used to turn a few refusals into `switch_limit` with no switch made.
        expect(`${refused.methodAdapter}:${refused.methodOffer}`).to.equal("core:sms");
        expect(Number(refused.switches || 0)).to.equal(0);

        await Settings.set("AUTH_SEND_MAX_PER_TARGET_HOUR", { key: "AUTH_SEND_MAX_PER_TARGET_HOUR", value: 5 });
        const switched = await AuthService.switchMethod(attempt.id as string, DEV, "testflash:flashcall");
        expect(switched.failReason).to.be.oneOf([null, undefined]);
        expect(`${switched.methodAdapter}:${switched.methodOffer}`).to.equal("testflash:flashcall");
        expect(Number(switched.switches)).to.equal(1);
      } finally {
        await Settings.set("AUTH_SEND_MAX_PER_TARGET_HOUR", { key: "AUTH_SEND_MAX_PER_TARGET_HOUR", value: 5 });
        await Settings.set("AUTH_MAX_SWITCHES", { key: "AUTH_MAX_SWITCHES", value: 3 });
      }
    });
  });

  /**
   * Everything that costs money goes through AuthService.spend() and nowhere else (review3 §1.7).
   * Before it there were two paths — one for a server-owned code, one for a provider-owned one —
   * and the three things below are what they disagreed about.
   */
  describe("one spend, one ledger (review3 §1.7)", function () {
    /** Move the whole ledger back in time: the only way past a pause without disabling it. */
    async function ageLedger(byMs: number) {
      const rows = await AuthSendLog.find({});
      if (rows.length) await AuthSendLog.update({ id: rows.map((r) => r.id) }, { at: Date.now() - byMs }).fetch();
    }

    it("never leaves a refused attempt without a screen (review3 §5.4)", async function () {
      // The operator's first choice is the flash-call, whose step is BORN of the spend: refuse
      // the spend and there is nothing to draw. This used to return an attempt with `step: null`
      // — authResend a no-op, authSubmit `stale_step`, no way forward but starting over.
      await AuthMethod.updateOne({ adapter: "testflash", offer: "flashcall" }, { sortOrder: 50 });
      await Settings.set("AUTH_SEND_MAX_PER_TARGET_HOUR", { key: "AUTH_SEND_MAX_PER_TARGET_HOUR", value: 1 });
      const target = "79995551070";
      try {
        // The one call the cap allows.
        const first = await AuthService.start({ purpose: "login", login: target, deviceId: "device-fallthrough-a" });
        expect(`${first.methodAdapter}:${first.methodOffer}`).to.equal("testflash:flashcall");

        const refused = await AuthService.start({ purpose: "login", login: target, deviceId: "device-fallthrough-b" });
        // A paid step gives way to a free one: the SMS row's `enter_code` costs nothing to build,
        // and the same refusal meets it inside claimAndSend — which is the state an SMS-first
        // installation has always ended in, and the one the client knows how to render.
        expect(`${refused.methodAdapter}:${refused.methodOffer}`).to.equal("core:sms");
        expect(refused.stepType).to.equal("enter_code");
        expect(refused.step).to.not.equal(null);
        expect(refused.failReason).to.equal("rate_limited");
        expect(refused.sentAt).to.be.oneOf([null, undefined]);
        // Nothing was bought by the fall-through: the cap refused both rows.
        expect(await AuthSendLog.countSince(target, 0)).to.equal(1);

        const view = await AuthService.view(await AuthAttempt.findOne({ id: refused.id }), "device-fallthrough-b");
        expect(view.nextAttemptAfterSeconds).to.be.greaterThan(0);
      } finally {
        await AuthMethod.updateOne({ adapter: "testflash", offer: "flashcall" }, { sortOrder: 200 });
        await Settings.set("AUTH_SEND_MAX_PER_TARGET_HOUR", { key: "AUTH_SEND_MAX_PER_TARGET_HOUR", value: 5 });
      }
    });

    it("ends the attempt honestly when there is no free method to fall back on", async function () {
      // A flash-call-only installation has nothing free to offer, so the attempt is terminal —
      // but the countdown stays alive, or the client cannot tell when authStart is worth calling.
      await AuthMethod.updateOne({ adapter: "core", offer: "sms" }, { enable: false });
      await Settings.set("AUTH_SEND_MAX_PER_TARGET_HOUR", { key: "AUTH_SEND_MAX_PER_TARGET_HOUR", value: 1 });
      const target = "79995551071";
      try {
        const first = await AuthService.start({ purpose: "login", login: target, deviceId: "device-nofree-a" });
        expect(first.failReason).to.be.oneOf([null, undefined]);

        const refused = await AuthService.start({ purpose: "login", login: target, deviceId: "device-nofree-b" });
        expect(refused.status).to.equal("failed");
        expect(refused.failReason).to.equal("rate_limited");

        const view = await AuthService.view(await AuthAttempt.findOne({ id: refused.id }), "device-nofree-b");
        expect(view.step).to.equal(null);
        expect(view.nextAttemptAfterSeconds).to.be.greaterThan(0);
      } finally {
        await enable("core", "sms");
        await Settings.set("AUTH_SEND_MAX_PER_TARGET_HOUR", { key: "AUTH_SEND_MAX_PER_TARGET_HOUR", value: 5 });
      }
    });

    it("makes 'again' a second call on a flash-call, not a no-op (review3 §5.2)", async function () {
      const target = "79995551072";
      const attempt = await AuthService.start({ purpose: "login", method: "testrotate:flashcall", login: target, deviceId: "device-again" });
      const firstSecret = await secretOf(attempt.id as string);
      expect(await AuthSendLog.countSince(target, 0)).to.equal(1);

      // The pause is the pause: step past it the way an hour would, not by switching it off.
      await ageLedger(2 * 60 * 1000);
      const again = await AuthService.resend(attempt.id as string, "device-again");

      // A second call carries a second code, so the step it belongs to is a new one and the
      // client has to redraw from it (И7). `adapter.resend()` used to be missing here, and the
      // service simply returned — "send it again" did nothing at all.
      expect(again.step.id).to.not.equal(attempt.step.id);
      expect(await secretOf(attempt.id as string)).to.not.equal(firstSecret);
      expect(await AuthSendLog.countSince(target, 0)).to.equal(2);
      expect(Number(again.resends)).to.equal(1);

      // And the new code is the one that works — the old one proves nothing any more.
      const stale = await AuthService.submit(attempt.id as string, again.step.id, firstSecret, { deviceId: "device-again" });
      expect(stale.failReason).to.equal("wrong_code");
      const done = await AuthService.submit(attempt.id as string, again.step.id, await secretOf(attempt.id as string), { deviceId: "device-again" });
      expect(done.status).to.equal("done");
    });

    it("writes nothing down when the provider call itself throws", async function () {
      // The ledger entry is made BEFORE the provider is touched (a gateway that fails after the
      // money left must still be counted), so the throw has to take it back — otherwise a broken
      // provider quietly eats the target's budget.
      const target = "79995551073";
      let thrown: unknown;
      try {
        await AuthService.start({ purpose: "login", method: "testbroken:flashcall", login: target, deviceId: "device-broken" });
      } catch (e) {
        thrown = e;
      }
      expect(thrown).to.not.equal(undefined);
      expect(await AuthSendLog.countSince(target, 0)).to.equal(0);
    });
  });

  /**
   * A dial-in attempt rents a number from a monthly pool the moment it starts, and until review2
   * §3 nothing ever called the adapter's cancel(): every abandoned attempt kept its number until
   * the provider's own timeout. design2 §10.5 asks for "a short lease and a mandatory cancel()".
   */
  describe("a leased number is given back (design2 §10.5)", function () {
    it("on supersede, on switch and on expiry — and not on completion", async function () {
      const dialin = AuthMethod.getAdapter("testdialin", "dialin") as FakeDialIn;
      dialin.released = [];
      const device = "device-lease";

      const first = await AuthService.start({ purpose: "login", method: "testdialin:dialin", login: "79995551080", deviceId: device });
      // Same device, same purpose: the first attempt is superseded, and its number goes with it.
      const second = await AuthService.start({ purpose: "login", method: "testdialin:dialin", login: "79995551081", deviceId: device });
      expect(dialin.released).to.deep.equal([first.providerRef]);

      // "The call never came, text me instead": the replaced step gives its number back — and
      // the rebuilt step carries no reference to it any more.
      const switched = await AuthService.switchMethod(second.id as string, device, "core:sms");
      expect(dialin.released).to.deep.equal([first.providerRef, second.providerRef]);
      expect(switched.providerRef).to.be.oneOf([null, undefined]);

      // An attempt that simply ran out is released by the sweep, before its row is deleted.
      const third = await AuthService.start({ purpose: "login", method: "testdialin:dialin", login: "79995551082", deviceId: "device-lease-2" });
      await AuthAttempt.updateOne({ id: third.id }, { expiresAt: Date.now() - 1 });
      await AuthService.sweepExpired();
      expect(dialin.released).to.deep.equal([first.providerRef, second.providerRef, third.providerRef]);
      expect(await AuthAttempt.findOne({ id: third.id })).to.not.exist;

      // A finished dial-in is the provider's job done; there is nothing to cancel.
      const fourth = await AuthService.start({ purpose: "login", method: "testdialin:dialin", login: "79995551083", deviceId: "device-lease-3" });
      await AuthService.handleSignal({ kind: "ani", dnis: fourth.step.dialNumber as string, ani: "79995551083" });
      await AuthService.sweepExpired();
      expect(dialin.released).to.have.length(3);
    });
  });

  /**
   * `resendAfterSec` is an editable column of the registry row and was, until review1 §4, a
   * control nobody read: the pause came from the global setting whatever the operator typed.
   * A flash-call and an SMS do not cost the same, so the row is allowed to disagree with the
   * default — and the countdown the client draws has to be the same number the budget enforces.
   */
  describe("the method row owns its own pause (review1 §4)", function () {
    it("paces the target by AuthMethod.resendAfterSec, and says so in the view", async function () {
      const target = "79995551030";
      await AuthMethod.updateOne({ adapter: "core", offer: "sms" }, { resendAfterSec: 300 });
      try {
        const attempt = await AuthService.start({ purpose: "login", method: "core:sms", login: target, deviceId: DEV });

        // 90 seconds ago: past the global 60 s pause, well inside this row's 300 s.
        const [log] = await AuthSendLog.find({ where: { target }, sort: "at DESC", limit: 1 });
        await AuthSendLog.update({ id: log.id }, { at: Date.now() - 90 * 1000 }).fetch();

        const view = await AuthService.view(await AuthAttempt.findOne({ id: attempt.id }), DEV);
        expect(view.nextAttemptAfterSeconds).to.be.greaterThan(60);

        const second = await AuthService.start({ purpose: "login", method: "core:sms", login: target, deviceId: "device-d" });
        expect(second.failReason).to.equal("rate_limited");
        expect(await AuthSendLog.countSince(target, 0)).to.equal(1);
      } finally {
        // 0, not null: the column is a plain number and 0 is what "inherit the global" means.
        await AuthMethod.updateOne({ adapter: "core", offer: "sms" }, { resendAfterSec: 0 });
      }
    });
  });

  /**
   * `authStart` without a login is legal — a social profile that carried no number lands on the
   * same screen — and it was also the way round the captcha on the login form: the number was
   * named later, at authSubmit, where nobody was asking (review1 §1.3). Core cannot check a
   * captcha (it has no request in hand), so what it owes the transport is the flag.
   */
  describe("the enter_phone step carries the captcha gate (review1 §1.3)", function () {
    const DEV_NO_LOGIN = "auth-test-device-no-login";

    it("asks for the number before spending anything, and marks the answer as owed by a human", async function () {
      const attempt = await AuthService.start({ purpose: "login", deviceId: DEV_NO_LOGIN });

      expect(attempt.step.type).to.equal("enter_phone");
      expect(attempt.step.captchaRequired).to.equal(true);
      expect(attempt.target).to.be.oneOf([null, undefined]);
      expect(emitted.filter((e) => e.event === "user_otp_requested")).to.have.length(0);
    });

    it("drops the flag once the number is fixed — the code step is not a second chance to aim", async function () {
      const target = "79995551024";
      const attempt = await AuthService.start({ purpose: "login", deviceId: DEV_NO_LOGIN });
      const aimed = await AuthService.submit(attempt.id as string, attempt.step.id, target, { deviceId: DEV_NO_LOGIN });

      expect(aimed.step.type).to.equal("enter_code");
      expect(aimed.step.captchaRequired).to.be.oneOf([false, undefined]);
      expect(await AuthSendLog.countSince(target, 0)).to.equal(1);
    });
  });

  describe("tickets", function () {
    it("refuses a ticket at a door it was not minted for (§10.3)", async function () {
      const attempt = await AuthService.start({ purpose: "login", login: "79995551009", deviceId: DEV });
      const done = await AuthService.submit(attempt.id as string, attempt.step.id, await secretOf(attempt.id as string), { deviceId: DEV });

      expect(await AuthService.consumeTicket(done.ticket as string, "verify:delete_account", DEV)).to.be.undefined;
      expect(await AuthService.consumeTicket(done.ticket as string, "login", DEV)).to.exist;
      // One-time: a replay finds it already spent.
      expect(await AuthService.consumeTicket(done.ticket as string, "login", DEV)).to.be.undefined;
    });

    it("binds the attempt to its device (§10.2)", async function () {
      const attempt = await AuthService.start({ purpose: "login", login: "79995551010", deviceId: DEV });
      await AuthService.submit(attempt.id as string, attempt.step.id, await secretOf(attempt.id as string), { deviceId: DEV });

      const stranger = await AuthService.view(await AuthAttempt.findOne({ id: attempt.id }), "some-other-device");
      expect(stranger.status).to.equal("expired");
      expect(stranger.ticket).to.equal(null);
    });

    it("expires, instead of waiting to be spent forever (review1 §3)", async function () {
      const attempt = await AuthService.start({ purpose: "login", login: "79995551025", deviceId: DEV });
      const done = await AuthService.submit(attempt.id as string, attempt.step.id, await secretOf(attempt.id as string), { deviceId: DEV });

      // completing an attempt re-aims its deadline at the ticket: nothing else ever expired a
      // `done` row, so the ticket in a client's storage used to work for as long as the row did.
      expect(Number(done.expiresAt)).to.be.greaterThan(Date.now());

      await AuthAttempt.updateOne({ id: attempt.id }, { expiresAt: Date.now() - 1000 });
      const stale = await AuthAttempt.findOne({ id: attempt.id });
      expect((await AuthService.view(stale, DEV)).ticket).to.equal(null);
      expect(await AuthService.consumeTicket(done.ticket as string, "login", DEV)).to.be.undefined;
    });

    it("keeps a finished attempt for the audit, then lets it go (review1 §3)", async function () {
      const attempt = await AuthService.start({ purpose: "login", login: "79995551026", deviceId: DEV });
      await AuthService.submit(attempt.id as string, attempt.step.id, await secretOf(attempt.id as string), { deviceId: DEV });

      // Inside the retention window a spent login is still on the record...
      await AuthAttempt.cleanupExpired();
      expect(await AuthAttempt.findOne({ id: attempt.id })).to.exist;

      // ...and past it the row goes, secret column and all, instead of growing by one per login.
      await AuthAttempt.updateOne({ id: attempt.id }, { expiresAt: Date.now() - 2000 });
      await AuthAttempt.cleanupExpired(1000);
      expect(await AuthAttempt.findOne({ id: attempt.id })).to.not.exist;
    });
  });

  describe("one reader of an attempt (review3 §2.5)", function () {
    it("expires what is still open, and leaves an answer that was already given", async function () {
      const DEV_A = "auth-test-device-reader-a";
      const DEV_B = "auth-test-device-reader-b";

      // Terminal the way the service produces it: a second attempt from the same device for the
      // same purpose supersedes the first (design2 Д15).
      const superseded = await AuthService.start({ purpose: "login", login: "79995551101", deviceId: DEV_A });
      await AuthService.start({ purpose: "login", login: "79995551102", deviceId: DEV_A });
      expect((await AuthAttempt.findOne({ id: superseded.id })).status).to.equal("superseded");

      const failed = await AuthService.start({ purpose: "login", login: "79995551103", deviceId: DEV_B });
      await AuthAttempt.updateOne({ id: failed.id }, { status: "failed", failReason: "no_method" });

      const past = Date.now() - 1000;
      await AuthAttempt.updateOne({ id: superseded.id }, { expiresAt: past });
      await AuthAttempt.updateOne({ id: failed.id }, { expiresAt: past });

      // A client polling either one is told why it ended, and keeps being told the same thing:
      // rewriting a terminal status to `expired` changes the reason for a refusal after the
      // fact, and the frontend branches on that reason (review3 §5.5).
      const polled = await AuthService.status(failed.id as string, DEV_B);
      expect(polled.status).to.equal("failed");
      expect(polled.failReason).to.equal("no_method");
      expect((await AuthService.status(superseded.id as string, DEV_A)).status).to.equal("superseded");

      // An attempt that never answered is a different matter: the deadline is its answer.
      const open = await AuthService.start({ purpose: "login", login: "79995551104", deviceId: DEV_B });
      await AuthAttempt.updateOne({ id: open.id }, { expiresAt: past });
      expect((await AuthService.status(open.id as string, DEV_B)).status).to.equal("expired");
      // ...and the same row is not one this device may still answer.
      expect(await AuthAttempt.load(open.id as string, { deviceId: DEV_B, liveOnly: true })).to.be.undefined;
    });

    it("hands a stranger nothing at all, overdue or not (§10.2)", async function () {
      const owner = "auth-test-device-reader-c";
      const mine = await AuthService.start({ purpose: "login", login: "79995551105", deviceId: owner });
      await AuthAttempt.updateOne({ id: mine.id }, { expiresAt: Date.now() - 1000 });

      expect(await AuthService.status(mine.id as string, "auth-test-device-someone-else")).to.be.undefined;
      // And not even a write: an attempt id is a secret address, so a guessed one must not come
      // back as "yes, and I have just marked it expired for you".
      expect((await AuthAttempt.findOne({ id: mine.id })).status).to.equal("awaiting_user");
      expect((await AuthService.status(mine.id as string, owner)).status).to.equal("expired");
    });
  });

  describe("flash-call is a call, not a message (§7.4, §10.1)", function () {
    it("sends nothing at all and keeps callerNumber server-side", async function () {
      const attempt = await AuthService.start({ purpose: "login", method: "testflash:flashcall", login: "79995551011", deviceId: DEV });

      // The whole point: naively reusing the OTP path here would bill an SMS containing the
      // digits of the number that is about to call.
      expect(emitted.filter((e) => e.event === "user_otp_requested")).to.have.length(0);
      expect(attempt.step.codeLength).to.equal(4);

      const view = JSON.stringify(await AuthService.view(attempt, DEV));
      // Leak it and the user computes the code without ever receiving the call.
      expect(view).to.not.contain("74951234567");
      expect(view).to.not.contain("4567");

      const done = await AuthService.submit(attempt.id as string, attempt.step.id, "4567", { deviceId: DEV });
      expect(done.status).to.equal("done");
      expect(emitted.filter((e) => e.event === "user_otp_requested")).to.have.length(0);

      const identity = await AuthIdentity.findByExternal("phone", "79995551011");
      expect((identity.proof as any).method).to.equal("flashcall");
    });
  });

  /**
   * Every way into an attempt — a code typed by a human, a bot webhook, an OAuth callback, a
   * dial-in ANI — is an answer to a step, and is applied as a conditional UPDATE naming that step
   * (И15, signal-idempotency.md). Providers retry, bodies get replayed, and two PM2 workers can
   * take the same delivery; before this, each of those was a second completion, a second session,
   * or a live step rebuilt under a user who was already typing into it.
   */
  describe("one entry per step, one completion per attempt (И15)", function () {
    /** Count the sessions actually issued: it is the side effect a double completion duplicates. */
    async function countAuthDevice<T>(fn: () => Promise<T>): Promise<{ result: T; calls: number }> {
      let calls = 0;
      const real = User.authDevice;
      User.authDevice = (async (...args: any[]) => {
        calls++;
        return await (real as any).apply(User, args);
      }) as any;
      try {
        return { result: await fn(), calls };
      } finally {
        User.authDevice = real;
      }
    }

    const source = { adapter: "core", method: "sms" };

    it("applies a deferred flash-call number once, and leaves the step alone on a repeat", async function () {
      const attempt = await AuthService.start({ purpose: "login", method: "testdeferred:flashcall", login: "79995551040", deviceId: DEV });
      // Deferred: there is nothing to type yet, so there is no field — only a spinner.
      expect(attempt.step.type).to.equal("await_signal");

      const first = (await AuthService.handleSignal({ kind: "code", attemptId: attempt.id as string, code: "1234" })) as AuthAttemptRecord;
      expect(first.step.type).to.equal("enter_code");
      expect(await secretOf(attempt.id as string)).to.equal("1234");

      const second = (await AuthService.handleSignal({ kind: "code", attemptId: attempt.id as string, code: "5678" })) as AuthAttemptRecord;
      // A replayed body used to mint a new step.id under a user who was already typing 1234 —
      // their code then came back `stale_step`, and the next replay did it again.
      expect(second.step.id).to.equal(first.step.id);
      expect(await secretOf(attempt.id as string)).to.equal("1234");
    });

    it("ignores a code signal for an attempt whose secret is already issued", async function () {
      const attempt = await AuthService.start({ purpose: "login", method: "testflash:flashcall", login: "79995551041", deviceId: DEV });
      expect(await secretOf(attempt.id as string)).to.equal("4567");

      const after = (await AuthService.handleSignal({ kind: "code", attemptId: attempt.id as string, code: "9999" })) as AuthAttemptRecord;
      // This flash-call was never deferred: its step is `enter_code` and its secret is spoken for.
      expect(await secretOf(attempt.id as string)).to.equal("4567");
      expect(after.step.id).to.equal(attempt.step.id);
    });

    it("completes once when two submits race, and hands both the same ticket", async function () {
      const device = "auth-race-device-1";
      const attempt = await AuthService.start({ purpose: "login", login: "79995551042", deviceId: device });
      const live = (await AuthAttempt.findOne({ id: attempt.id })) as AuthAttemptRecord;

      const { result, calls } = await countAuthDevice(async () =>
        await Promise.all([
          AuthService.complete(live, { deviceId: device }, source),
          AuthService.complete(live, { deviceId: device }, source),
        ])
      );

      // Two sessions on one attempt: the loser used to get its own UserDevice.sessionId, which
      // silently invalidated the winner's.
      expect(calls).to.equal(1);
      expect(result[0].ticket).to.be.a("string");
      expect(result[1].ticket).to.equal(result[0].ticket);

      const done = await AuthAttempt.findOne({ id: attempt.id });
      const custom = typeof done.customData === "string" ? JSON.parse(done.customData) : done.customData;
      expect(custom.sessionId).to.equal((await UserDevice.findOne({ id: device })).sessionId);
    });

    it("finishes a dial-in on the first call, not once per retry", async function () {
      const target = "79995551043";
      const device = "auth-race-device-2";
      const attempt = await AuthService.start({ purpose: "login", method: "testdialin:dialin", login: target, deviceId: device });
      expect(attempt.step.type).to.equal("dial_number");
      const dnis = attempt.step.dialNumber as string;

      const { calls } = await countAuthDevice(async () => {
        // Telephony retries, and there is no call-id to deduplicate on — the step is the key.
        await Promise.all([
          AuthService.handleSignal({ kind: "ani", dnis, ani: target }),
          AuthService.handleSignal({ kind: "ani", dnis, ani: target }),
          AuthService.handleSignal({ kind: "ani", dnis, ani: target }),
        ]);
        await AuthService.handleSignal({ kind: "ani", dnis, ani: target });
      });

      expect(calls).to.equal(1);
      expect((await AuthAttempt.findOne({ id: attempt.id })).status).to.equal("done");
    });

    it("refuses a signal that lands after the deadline, however it raced the read", async function () {
      const device = "auth-race-device-3";
      const attempt = await AuthService.start({ purpose: "login", login: "79995551044", deviceId: device });
      // The record a webhook is holding, read a millisecond before the attempt ran out.
      const live = (await AuthAttempt.findOne({ id: attempt.id })) as AuthAttemptRecord;
      await AuthAttempt.updateOne({ id: attempt.id }, { expiresAt: Date.now() - 1 });

      expect(await AuthService.handleSignal({ kind: "phone_match", attemptId: attempt.id as string, matched: true })).to.be.undefined;

      // The deadline is inside the completing UPDATE, not only in the read that preceded it —
      // so it does not matter which side of it that read landed on (design2 §6).
      const refused = await AuthService.complete(live, { deviceId: device }, source);
      expect(refused.status).to.not.equal("done");
      expect(refused.ticket).to.be.oneOf([null, undefined]);
      expect(await UserDevice.findOne({ id: device })).to.not.exist;
    });

    it("releases the claim when completing throws, instead of stranding the attempt", async function () {
      const device = "auth-race-device-4";
      const attempt = await AuthService.start({ purpose: "login", login: "79995551045", deviceId: device });
      const live = (await AuthAttempt.findOne({ id: attempt.id })) as AuthAttemptRecord;

      const real = User.authDevice;
      User.authDevice = (async () => {
        throw new Error("session store down");
      }) as any;
      let thrown: any;
      try {
        await AuthService.complete(live, { deviceId: device }, source);
      } catch (e) {
        thrown = e;
      } finally {
        User.authDevice = real;
      }
      expect(thrown).to.be.an("error");

      // The claim is written before the side effects, so a failure has to give it back — or the
      // attempt stays live to look at and can never be completed by anyone.
      expect((await AuthAttempt.findOne({ id: attempt.id })).ticket).to.be.oneOf([null, undefined]);
      const retried = await AuthService.complete(live, { deviceId: device }, source);
      expect(retried.status).to.equal("done");
    });

    it("does not rebuild the phone-proof step when the same profile arrives twice", async function () {
      const device = "auth-race-device-5";
      const attempt = await AuthService.start({ purpose: "login", method: "testsocial:oauth", deviceId: device });
      expect(attempt.step.type).to.equal("redirect");

      const profile: NormalizedProfile = {
        provider: "testsocial",
        externalId: "social-1046",
        phone: { code: "7", number: "9995551046" },
        phoneVerifiedByProvider: false,
      };
      const first = await AuthService.acceptProfile(attempt, profile, { deviceId: device });
      expect(first.step.type).to.equal("enter_code");

      // A bot retry, or an F5 on the callback URL, holding the same pre-park record.
      const second = await AuthService.acceptProfile(attempt, profile, { deviceId: device });
      expect(second.step.id).to.equal(first.step.id);
      expect(second.status).to.not.equal("done");
    });

    it("writes a policy refusal as the attempt's outcome instead of throwing (review2 §3)", async function () {
      const device = "device-refusal";
      const account = await AuthService.materializeUser({
        phone: { code: "7", number: "9995551095" },
        proof: { at: Date.now(), method: "sms", adapter: "core", purpose: "login" },
      });
      // One phone per account, no change allowed (the suite's defaults): linking a second number
      // is refused by policy at the very end, after the code has been proven.
      const attempt = await AuthService.start({ purpose: "link", login: "79995551096", user: account.user.id as string, deviceId: device });
      const outcome = await AuthService.submit(attempt.id as string, attempt.step.id, await secretOf(attempt.id as string), { deviceId: device });

      // Half of complete()'s callers are webhooks with nobody to throw to; the person polling
      // authStatus only ever sees the row.
      expect(outcome.status).to.equal("failed");
      expect(outcome.failReason).to.equal("phone_change_disabled");
      expect(outcome.ticket).to.be.oneOf([null, undefined]);
      expect(await AuthIdentity.findByExternal("phone", "79995551096")).to.not.exist;
    });
  });

  /**
   * `canVerifyPhone` says the protocol can prove a number; `phoneVerifiedByProvider` says this
   * profile's number was. Neither says anything when the profile carries no number at all — and
   * the fallback that case used to get was the attempt's own `target`, i.e. whatever the client
   * typed at authStart (review2 §2.4).
   */
  describe("a vouched-for profile has to carry the number it vouches for (review2 §2.4)", function () {
    it("does not let a numberless profile adopt the number the client typed", async function () {
      const device = "device-vouch";
      const victim = await AuthService.materializeUser({
        phone: { code: "7", number: "9995551070" },
        proof: { at: Date.now(), method: "sms", adapter: "core", purpose: "login" },
      });

      const attempt = await AuthService.start({ purpose: "login", method: "testvouch:oauth", login: "79995551070", deviceId: device });
      expect(attempt.step.type).to.equal("redirect");

      // An adapter defect: "verified", with nothing to have verified.
      const parked = await AuthService.acceptProfile(attempt, { provider: "testvouch", externalId: "vouch-1070", phoneVerifiedByProvider: true }, { deviceId: device });
      expect(parked.status).to.not.equal("done");
      expect(parked.step.type).to.be.oneOf(["enter_phone", "enter_code"]);
      // The victim's account is untouched: no session, no new key.
      expect(await AuthIdentity.find({ user: victim.user.id })).to.have.length(1);
      expect(await UserDevice.findOne({ id: device })).to.not.exist;

      // The same provider with a number really is a sign-in, gate off — the fix is not a ban.
      const honest = await AuthService.start({ purpose: "login", method: "testvouch:oauth", deviceId: "device-vouch-2" });
      const done = await AuthService.acceptProfile(honest, { provider: "testvouch", externalId: "vouch-1071", phone: { code: "7", number: "9995551071" }, phoneVerifiedByProvider: true }, { deviceId: "device-vouch-2" });
      expect(done.status).to.equal("done");
      expect((await AuthIdentity.findByExternal("phone", "79995551071")).proof).to.exist;
    });
  });

  /**
   * `User.delete` is a soft delete, and the auth cycle never looked at `isDeleted`: the
   * identities stayed, the number stayed occupied, and the next code sent to it opened the
   * "deleted" account (review2 §3). The keys go with the account now.
   */
  describe("a deleted account keeps no keys (review2 §3)", function () {
    it("frees the number, closes the sessions, and the next login is a new account", async function () {
      const number = "79995551090";
      const device = "device-deleted";
      const account = await AuthService.materializeUser({
        phone: { code: "7", number: "9995551090" },
        email: "deleted-account@example.com",
        proof: { at: Date.now(), method: "sms", adapter: "core", purpose: "login" },
      });
      await User.authDevice(account.user.id as string, device, "test", "", "");

      await User.delete(account.user.id as string, undefined, true);

      const gone = await User.findOne({ id: account.user.id });
      expect(gone.isDeleted).to.equal(true);
      expect(gone.phone).to.be.oneOf([null, undefined]);
      // The address goes too: nothing about it is an identity, so nothing else would clear it.
      expect(gone.email).to.be.oneOf([null, undefined]);
      expect(gone.verified).to.equal(false);
      expect(await AuthIdentity.find({ user: account.user.id })).to.have.length(0);
      expect(await AuthIdentity.findByExternal("phone", number)).to.not.exist;
      expect((await UserDevice.findOne({ id: device })).isLoggedIn).to.equal(false);

      const attempt = await AuthService.start({ purpose: "login", login: number, deviceId: device });
      const done = await AuthService.submit(attempt.id as string, attempt.step.id, await secretOf(attempt.id as string), { deviceId: device });
      const fresh = (await AuthService.consumeTicket(done.ticket as string, "login", device)).userId;
      expect(fresh).to.be.a("string");
      expect(fresh).to.not.equal(account.user.id);
      expect((await User.findOne({ id: account.user.id })).isDeleted).to.equal(true);
    });

    it("treats an account flagged deleted by hand the same way", async function () {
      // The admin panel exposes `isDeleted` as an editable checkbox; nothing cleans up after it.
      const number = "79995551093";
      const account = await AuthService.materializeUser({
        phone: { code: "7", number: "9995551093" },
        proof: { at: Date.now(), method: "sms", adapter: "core", purpose: "login" },
      });
      await User.updateOne({ id: account.user.id }, { isDeleted: true });

      const attempt = await AuthService.start({ purpose: "login", login: number, deviceId: "device-deleted-2" });
      const done = await AuthService.submit(attempt.id as string, attempt.step.id, await secretOf(attempt.id as string), { deviceId: "device-deleted-2" });
      const fresh = (await AuthService.consumeTicket(done.ticket as string, "login", "device-deleted-2")).userId;
      expect(fresh).to.not.equal(account.user.id);
      // The orphaned row was reclaimed, not duplicated: one identity for the number, owned anew.
      const identity = await AuthIdentity.findByExternal("phone", number);
      expect(identity.user).to.equal(fresh);
      expect(await AuthIdentity.count({ externalId: number })).to.equal(1);
    });
  });

  /**
   * `pm2-runtime start restoapp.js -i max` boots N workers at once, and every one of them runs
   * every adapter's alive() against the same table. Until review2 §2.2 the loser of the create
   * race rejected on the unique index — and never remembered its instance, so that worker
   * answered `no_method` to every sign-in until somebody restarted it.
   */
  describe("registration survives a cluster boot (review2 §2.2)", function () {
    class ClusterAdapter extends AuthAdapter {
      public healthy = true;
      constructor(slug: string) {
        super({
          adapter: slug,
          title: slug,
          sortOrder: 900,
          offers: [{ kind: "phone_proof", offer: "sms", mode: "enter_code", secretOrigin: "server", codeLength: 6 }],
        });
      }
      public async start(): Promise<StartResult> {
        return {};
      }
      public async healthcheck(): Promise<{ ok: boolean; message?: string }> {
        return { ok: this.healthy };
      }
    }

    it("serves the method on the worker that lost the create race", async function () {
      const realCreate = AuthMethod.create;
      // The other worker inserts the row between our read and our write; our insert then fails
      // exactly the way the unique index makes it fail.
      AuthMethod.create = ((values: any) => ({
        fetch: async () => {
          AuthMethod.create = realCreate;
          await (realCreate as any).call(AuthMethod, values).fetch();
          throw new Error('duplicate key value violates unique constraint "authmethod_adapter_offer_uidx"');
        },
      })) as any;
      let adapter: ClusterAdapter;
      try {
        adapter = new ClusterAdapter("testrace");
        await adapter.wait();
      } finally {
        AuthMethod.create = realCreate;
      }
      expect(AuthMethod.getAdapter("testrace", "sms")).to.equal(adapter);
      expect(await AuthMethod.count({ adapter: "testrace", offer: "sms" })).to.equal(1);
    });

    it("remembers the instance before it writes anything", async function () {
      const realCreate = AuthMethod.create;
      AuthMethod.create = (() => ({ fetch: async () => { throw new Error("database is away"); } })) as any;
      let failed: unknown;
      let adapter: ClusterAdapter;
      try {
        adapter = new ClusterAdapter("testdown");
        await adapter.wait();
      } catch (e) {
        failed = e;
      } finally {
        AuthMethod.create = realCreate;
      }
      expect(failed).to.exist;
      // The row could not be made, but the process can still serve it once somebody makes it.
      expect(AuthMethod.getAdapter("testdown", "sms")).to.equal(adapter);
    });

    it("lets only the primary worker write healthStatus", async function () {
      const previous = process.env.NODE_APP_INSTANCE;
      try {
        // A secondary worker whose provider check fails: the shared column is not its to flip.
        process.env.NODE_APP_INSTANCE = "3";
        await AuthMethod.create({ adapter: "testsecondary", offer: "sms", kind: "phone_proof", healthStatus: "ready", enable: true } as any).fetch();
        const secondary = new ClusterAdapter("testsecondary");
        secondary.healthy = false;
        await secondary.wait();
        expect((await AuthMethod.findOne({ adapter: "testsecondary", offer: "sms" })).healthStatus).to.equal("ready");

        // The primary writes what it measured.
        delete process.env.NODE_APP_INSTANCE;
        const primary = new ClusterAdapter("testprimary");
        primary.healthy = false;
        await primary.wait();
        expect((await AuthMethod.findOne({ adapter: "testprimary", offer: "sms" })).healthStatus).to.equal("needs_setup");
      } finally {
        if (previous === undefined) delete process.env.NODE_APP_INSTANCE;
        else process.env.NODE_APP_INSTANCE = previous;
      }
    });
  });

  describe("the guest order (extend §5.2)", function () {
    it("claims the number without granting access, and is adopted on first login", async function () {
      const guest = await AuthService.materializeUser({ phone: { code: "7", number: "9995551012" }, firstName: "Guest" });
      expect(guest.identity.proof).to.be.oneOf([null, undefined]);
      expect((await User.findOne({ id: guest.user.id })).verified).to.equal(false);

      // Holding the unique key is what keeps a repeat guest order in the same profile.
      const again = await AuthService.materializeUser({ phone: { code: "7", number: "9995551012" }, firstName: "Guest" });
      expect(again.user.id).to.equal(guest.user.id);

      const attempt = await AuthService.start({ purpose: "login", login: "79995551012", deviceId: DEV });
      const done = await AuthService.submit(attempt.id as string, attempt.step.id, await secretOf(attempt.id as string), { deviceId: DEV });
      expect(done.user).to.equal(guest.user.id);
      expect((await User.findOne({ id: guest.user.id })).verified).to.equal(true);
    });
  });

  describe("the identity set", function () {
    it("never takes an identity away from another account (И2/И14)", async function () {
      const owner = await AuthService.materializeUser({ phone: { code: "7", number: "9995551013" } });
      const other = await AuthService.materializeUser({ phone: { code: "7", number: "9995551014" } });

      let refused: any;
      try {
        await AuthService.attachIdentity(other.user.id as string, "phone", "79995551013");
      } catch (e) { refused = e; }
      expect(refused).to.equal("identity_taken");
      expect((await AuthIdentity.findByExternal("phone", "79995551013")).user).to.equal(owner.user.id);
    });

    it("refuses at the cardinality limit instead of replacing silently (extend §4.2)", async function () {
      const account = await AuthService.materializeUser({ phone: { code: "7", number: "9995551015" } });

      let refused: any;
      try {
        await AuthService.attachIdentity(account.user.id as string, "phone", "79995559999");
      } catch (e) { refused = e; }
      // Losing a way in is losing access, and the user might not notice for a month.
      expect(refused).to.equal("phone_change_disabled");
      expect(await AuthIdentity.find({ user: account.user.id, provider: "phone" })).to.have.length(1);
    });

    it("will not let the last way in be removed (И9)", async function () {
      const account = await AuthService.materializeUser({
        phone: { code: "7", number: "9995551016" },
        proof: { at: Date.now(), method: "sms", adapter: "core", purpose: "login" },
      });
      const reason = await AuthService.unlinkBlockedReason(account.user.id as string, account.identity);
      expect(reason).to.equal("last_login_method");
    });
  });

  describe("security notices (extend §6)", function () {
    it("announces a new key to the incumbent, and says nothing for the first one", async function () {
      const account = await AuthService.materializeUser({
        phone: { code: "7", number: "9995551017" },
        proof: { at: Date.now(), method: "sms", adapter: "core", purpose: "login" },
      });
      // Registration: nobody to warn, nothing to warn about.
      expect(emitted.filter((e) => e.event === "user_identity_linked")).to.have.length(0);

      await AuthService.attachIdentity(account.user.id as string, "telegram", "tg-test-1017", {
        proof: { at: Date.now(), method: "identity", adapter: "telegram", purpose: "link" },
      });

      const notice = emitted.find((e) => e.event === "user_identity_linked");
      expect(notice).to.exist;
      // Masked: an SMS is read off a lock screen.
      expect(notice.payload.context.identity.maskedTarget).to.equal("tg•••17");
    });

    it("addresses the notice to the number on record, and rings once per change (review3 §1.8)", async function () {
      const account = await AuthService.materializeUser({
        phone: { code: "7", number: "9995551018" },
        proof: { at: Date.now(), method: "sms", adapter: "core", purpose: "login" },
      });

      await AuthService.attachIdentity(account.user.id as string, "telegram", "tg-test-1018", {
        proof: { at: Date.now(), method: "identity", adapter: "telegram", purpose: "link" },
      });
      await AuthService.attachIdentity(account.user.id as string, "max", "max-test-1018", {
        proof: { at: Date.now(), method: "identity", adapter: "max", purpose: "link" },
      });

      const notices = emitted.filter((e) => e.event === "user_identity_linked" && e.payload.recipient.userId === account.user.id);
      expect(notices).to.have.length(2);

      // The SNAPSHOT, not the projection. The pipeline reloads the user before a channel reads an
      // address off it, and by then User.phone has been recomputed from the CHANGED identity set
      // — so without this the notice would go to whoever just made the change (review2 §1.3).
      for (const notice of notices) {
        expect(notice.payload.recipient.address.phone.number).to.equal("9995551018");
      }

      // Two changes, two alarms. Under the pipeline's auto-built key (event + type + user) the
      // second one would be dropped as a duplicate send, and two changes in a row is exactly
      // what a takeover looks like.
      expect(notices[0].payload.meta.idempotencyKey).to.not.equal(notices[1].payload.meta.idempotencyKey);
    });
  });

  /**
   * The callback hands `customData.redirectBack` to res.redirect(), and the client chose that
   * value — so the allowlist, not the client, decides where a trusted domain sends the browser.
   */
  describe("the post-login redirect is not an open one (review1 §1.4)", function () {
    const BASE = "https://api.example.com";
    // Settings.set re-validates a json value, so it wants the schema the manifest declares.
    const ORIGINS_SCHEMA = { type: "array", items: { type: "string" }, minItems: 0 };

    before(async function () {
      await Settings.set("AUTH_CALLBACK_BASE_URL", { key: "AUTH_CALLBACK_BASE_URL", type: "string", value: BASE });
      await Settings.set("AUTH_REDIRECT_ALLOWED_ORIGINS", {
        key: "AUTH_REDIRECT_ALLOWED_ORIGINS",
        type: "json",
        jsonSchema: ORIGINS_SCHEMA,
        value: ["https://shop.example.com", "myapp://auth"],
      });
      const channelDefaults = {
        type: "custom",
        providerModule: null as unknown as string,
        managedBy: "operator" as const,
        status: "ready" as const,
        countries: [] as string[],
        concepts: [] as string[],
        platforms: [] as string[],
        defaultConcept: null as unknown as string,
        allowConceptSwitch: true,
        settings: {},
        publicConfig: {},
        secretsRef: {},
        sortOrder: 0,
      };
      await SalesChannel.create({ ...channelDefaults, key: "redirect-test-web", title: "Storefront", enabled: true, url: "https://web.example.com/menu" }).fetch();
      await SalesChannel.create({ ...channelDefaults, key: "redirect-test-off", title: "Retired", enabled: false, url: "https://old.example.com" }).fetch();
    });

    after(async function () {
      await SalesChannel.destroy({ key: ["redirect-test-web", "redirect-test-off"] });
      await Settings.set("AUTH_CALLBACK_BASE_URL", { key: "AUTH_CALLBACK_BASE_URL", type: "string", value: "" });
      await Settings.set("AUTH_REDIRECT_ALLOWED_ORIGINS", { key: "AUTH_REDIRECT_ALLOWED_ORIGINS", type: "json", jsonSchema: ORIGINS_SCHEMA, value: [] });
    });

    it("sends the browser somewhere the operator named, and nowhere else", async function () {
      // Declared origin, plus a path of the SPA's own choosing.
      expect(await resolveRedirectBack("https://shop.example.com/account?login=ok")).to.equal("https://shop.example.com/account?login=ok");
      // An enabled channel's storefront is a place of ours; a disabled one is not.
      expect(await resolveRedirectBack("https://web.example.com/thanks")).to.equal("https://web.example.com/thanks");
      expect(await resolveRedirectBack("https://old.example.com/thanks")).to.equal(BASE);
      // A native client returns to its own scheme.
      expect(await resolveRedirectBack("myapp://auth/done")).to.equal("myapp://auth/done");
      // A path on this server needs no origin check.
      expect(await resolveRedirectBack("/account?login=ok")).to.equal("/account?login=ok");
    });

    it("refuses the whole family of lookalikes instead of matching by suffix", async function () {
      const refused = [
        "https://evil.com/phish",
        // A suffix rule ("endsWith('.example.com')") is how open redirects come back.
        "https://shop.example.com.evil.com/phish",
        "https://sub.shop.example.com/phish",
        // Same host, wrong scheme and wrong port: the origin is all three parts.
        "http://shop.example.com/phish",
        "https://shop.example.com:8443/phish",
        // Protocol-relative, and the backslash forms browsers normalise into it.
        "//evil.com/phish",
        "/\\evil.com/phish",
        "\\/evil.com/phish",
        // Never a destination, allowlisted or not.
        "javascript:alert(document.domain)",
        "data:text/html,<script>alert(1)</script>",
        // A newline in a Location header is header injection, not a URL.
        "https://shop.example.com/ok\nLocation: https://evil.com",
      ];
      for (const candidate of refused) {
        expect(await resolveRedirectBack(candidate), candidate).to.equal(BASE);
      }
    });

    it("treats a refused value exactly like an absent one", async function () {
      // Nothing in the response tells the caller whether the allowlist was consulted at all.
      expect(await resolveRedirectBack(undefined)).to.equal(BASE);
      expect(await resolveRedirectBack("")).to.equal(BASE);
      expect(await resolveRedirectBack("https://evil.com")).to.equal(BASE);

      // With no base URL configured there is nowhere to send anyone: the callback keeps the
      // browser on its own "you can close this window" page rather than inventing a target.
      await Settings.set("AUTH_CALLBACK_BASE_URL", { key: "AUTH_CALLBACK_BASE_URL", type: "string", value: "" });
      expect(await resolveRedirectBack("https://evil.com")).to.equal(null);
      expect(await resolveRedirectBack("https://shop.example.com/ok")).to.equal("https://shop.example.com/ok");
      await Settings.set("AUTH_CALLBACK_BASE_URL", { key: "AUTH_CALLBACK_BASE_URL", type: "string", value: BASE });
    });
  });

  describe("projections (И13)", function () {
    it("clears User.phone when the last phone identity goes", async function () {
      const account = await AuthService.materializeUser({
        phone: { code: "7", number: "9995551018" },
        proof: { at: Date.now(), method: "sms", adapter: "core", purpose: "login" },
      });
      await AuthIdentity.destroy({ id: account.identity.id });
      await AuthService.syncUserProjections(account.user.id as string);

      const bare = await User.findOne({ id: account.user.id });
      // A stale number here would keep bonus/RMS adapters keyed to something the account lost.
      expect(bare.phone).to.be.oneOf([null, undefined]);
      expect(bare.verified).to.equal(false);
    });

    it("splits a foreign number by the country dictionary, not by its first digit (review1 §3)", async function () {
      const attempt = await AuthService.start({ purpose: "login", login: "380631234567", deviceId: DEV });
      await AuthService.submit(attempt.id as string, attempt.step.id, await secretOf(attempt.id as string), { deviceId: DEV });

      const identity = await AuthIdentity.findByExternal("phone", "380631234567");
      const user = await User.findOne({ id: identity.user as string });
      // "+3" is not a country, and User.phone's own validator rejects it — so the old split did
      // not merely mislabel non-Russian numbers, it failed to write the projection at all.
      expect(user.phone).to.deep.equal({ code: "380", number: "631234567" });
    });

    it("takes an email as a profile attribute and never as a way in", async function () {
      const account = await AuthService.materializeUser({
        email: "auth-projection@example.com",
        phone: { code: "7", number: "9995551027" },
        proof: { at: Date.now(), method: "sms", adapter: "core", purpose: "login" },
      });
      const userId = account.user.id as string;

      // The address lands on the profile...
      expect((await User.findOne({ id: userId })).email).to.equal("auth-projection@example.com");
      // ...and nowhere else: the core cannot prove an address, so it anchors nothing (review3
      // §1.2). The only identity this account has is its number.
      const identities = await AuthIdentity.find({ user: userId });
      expect(identities.map((i) => i.provider)).to.deep.equal(["phone"]);
      expect(await AuthIdentity.findByExternal("email", "auth-projection@example.com")).to.be.undefined;

      // It is a contact, not a projection: re-deriving the account from its identities leaves
      // the address where it was.
      await AuthService.syncUserProjections(userId);
      expect((await User.findOne({ id: userId })).email).to.equal("auth-projection@example.com");
    });
  });
  /**
   * Every cap before this one is keyed by something the sender chooses: the login they aim at,
   * the device id they send, the address they come from. A rotated device id and a proxy pool
   * cost nothing, so caps keyed on them bound nobody — what they do bound is the bill, and only
   * if the cap is on the ledger itself (send-caps.md §0). These tests are about the caps that
   * survive an attacker changing where they come from.
   */
  describe("a source is not a boundary (send-caps.md)", function () {
    const HOUR = 60 * 60 * 1000;
    const COUNTRIES_SCHEMA = { type: "array", items: { type: "string" }, minItems: 0 };

    async function setGlobalHour(value: number) {
      await Settings.set("AUTH_SEND_MAX_GLOBAL_HOUR", { key: "AUTH_SEND_MAX_GLOBAL_HOUR", type: "number", value });
    }

    async function setAllowedCountries(value: string[]) {
      await Settings.set("AUTH_SEND_ALLOWED_COUNTRIES", {
        key: "AUTH_SEND_ALLOWED_COUNTRIES",
        type: "json",
        jsonSchema: COUNTRIES_SCHEMA,
        value,
      });
    }

    /** Move the whole ledger back in time — the only way to watch an hourly window roll over. */
    async function ageLedger(byMs: number) {
      const rows = await AuthSendLog.find({});
      if (rows.length) await AuthSendLog.update({ id: rows.map((r) => r.id) }, { at: Date.now() - byMs }).fetch();
    }

    beforeEach(async function () {
      await setGlobalHour(0);
      await setAllowedCountries([]);
      await Settings.set("AUTH_MAX_LIVE_ATTEMPTS_PER_DEVICE", { key: "AUTH_MAX_LIVE_ATTEMPTS_PER_DEVICE", type: "number", value: 0 });
    });

    after(async function () {
      await setGlobalHour(0);
      await setAllowedCountries([]);
      await Settings.set("AUTH_MAX_LIVE_ATTEMPTS_PER_DEVICE", { key: "AUTH_MAX_LIVE_ATTEMPTS_PER_DEVICE", type: "number", value: 0 });
    });

    it("the ledger total is a cap, not a source", async function () {
      // Relative to what the run has already spent: the cap is on the ledger, and the ledger is
      // shared with every test above.
      const spent = await AuthSendLog.countAllSince(0);
      await setGlobalHour(spent + 2);

      // Two different numbers, two different devices, one shared budget.
      const first = await AuthService.start({ purpose: "login", login: "79995551050", deviceId: "device-global-a" });
      const second = await AuthService.start({ purpose: "login", login: "79995551051", deviceId: "device-global-b" });
      expect(first.failReason).to.be.oneOf([null, undefined]);
      expect(second.failReason).to.be.oneOf([null, undefined]);

      const refused = await AuthService.start({ purpose: "login", login: "79995551052", deviceId: "device-global-c" });
      expect(refused.failReason).to.equal("rate_limited");
      // Refused before the spend: this number was never written down, so it never cost anything.
      expect(await AuthSendLog.countSince("79995551052", 0)).to.equal(0);

      // And the client is not handed a live button: this target's own pause is 0 (nothing was
      // ever sent to it), so a countdown computed from the target alone would say "try now",
      // which is exactly the loop the cap exists to stop.
      const view = await AuthService.view(await AuthAttempt.findOne({ id: refused.id }), "device-global-c");
      expect(view.nextAttemptAfterSeconds).to.be.greaterThan(0);

      // An hour later the window has rolled and the same budget is there again.
      await ageLedger(2 * HOUR);
      const later = await AuthService.start({ purpose: "login", login: "79995551053", deviceId: "device-global-d" });
      expect(later.failReason).to.be.oneOf([null, undefined]);
    });

    it("a failed send gives the global budget back", async function () {
      const spent = await AuthSendLog.countAllSince(0);
      await setGlobalHour(spent + 1);

      const capture = NotificationService.emit;
      NotificationService.emit = (async () => {
        throw `the SMS gateway is down`;
      }) as any;
      let failed: any;
      try {
        failed = await AuthService.start({ purpose: "login", login: "79995551054", deviceId: "device-global-e" });
      } finally {
        NotificationService.emit = capture;
      }
      expect(failed.failReason).to.equal("send_failed");

      // The reservation was written before the provider was called and has to come back with it:
      // a budget that counts sends nobody received is a budget that locks the installation out.
      const after = await AuthService.start({ purpose: "login", login: "79995551055", deviceId: "device-global-f" });
      expect(after.failReason).to.be.oneOf([null, undefined]);
    });

    it("foreign numbers are refused before any spend", async function () {
      await setAllowedCountries(["RU"]);

      const foreign = await AuthService.start({ purpose: "login", login: "380631234500", deviceId: "device-country-a" });
      // The one refusal the user is told the reason for: they can act on it, and an allowlist is
      // not a secret worth keeping from them.
      expect(foreign.failReason).to.equal("country_not_allowed");
      expect(await AuthSendLog.countSince("380631234500", 0)).to.equal(0);

      // +7 is one calling code for two countries, so an allowlist naming either lets both in.
      // Documented rather than fixed: they are one tariff, and the setting says so.
      const kazakh = await AuthService.start({ purpose: "login", login: "77012345600", deviceId: "device-country-b" });
      expect(kazakh.failReason).to.be.oneOf([null, undefined]);

      // ...and naming KZ alone still lets a Kazakh number through, which splitting the number
      // first would not: to the projection an 11-digit +7 number is code "7", never "77".
      await setAllowedCountries(["KZ"]);
      const kazakhAgain = await AuthService.start({ purpose: "login", login: "77012345601", deviceId: "device-country-c" });
      expect(kazakhAgain.failReason).to.be.oneOf([null, undefined]);
    });

    it("falls back to the project's own COUNTRY_ISO when nobody has named an allowlist (review1 §5.2)", async function () {
      // AUTH_SEND_ALLOWED_COUNTRIES is already [] from beforeEach — the unconfigured state.
      // Left alone, that used to mean "everywhere"; it is now supposed to mean "just here".
      await Settings.set("COUNTRY_ISO", { key: "COUNTRY_ISO", type: "string", value: "RU" });
      try {
        const foreign = await AuthService.start({ purpose: "login", login: "380631234502", deviceId: "device-country-e" });
        expect(foreign.failReason).to.equal("country_not_allowed");

        const home = await AuthService.start({ purpose: "login", login: "79995551056", deviceId: "device-country-f" });
        expect(home.failReason).to.be.oneOf([null, undefined]);
      } finally {
        await Settings.set("COUNTRY_ISO", { key: "COUNTRY_ISO", type: "string", value: null });
      }
    });

    it("allows everywhere only when neither the allowlist nor COUNTRY_ISO is set", async function () {
      // Both unconfigured — setup has not run at all. "everywhere" is the only honest answer.
      await Settings.set("COUNTRY_ISO", { key: "COUNTRY_ISO", type: "string", value: null });
      const foreign = await AuthService.start({ purpose: "login", login: "380631234503", deviceId: "device-country-g" });
      expect(foreign.failReason).to.be.oneOf([null, undefined]);
    });

    it("fourth live attempt on a device is refused", async function () {
      await Settings.set("AUTH_MAX_LIVE_ATTEMPTS_PER_DEVICE", { key: "AUTH_MAX_LIVE_ATTEMPTS_PER_DEVICE", type: "number", value: 3 });
      const device = "device-live-attempts";

      // A step-up takes its target from the account, not from `login` (review2 §1.2), so each
      // one below gets an account of its own — what the case is about is the count per device,
      // and four attempts must still mean four different numbers.
      const owner = async (number: string) => (await AuthService.materializeUser({ phone: { code: "7", number } })).user.id as string;

      const login = await AuthService.start({ purpose: "login", login: "79995551060", deviceId: device });
      await AuthService.start({ purpose: "verify:phone", login: "79995551061", deviceId: device });
      await AuthService.start({ purpose: "verify:delete_account", user: await owner("9995551062"), deviceId: device });

      let refused: unknown = null;
      try {
        await AuthService.start({ purpose: "verify:unlink_identity", user: await owner("9995551063"), deviceId: device });
      } catch (e) {
        refused = e;
      }
      // Thrown, not reported: there is no attempt yet to carry a failReason.
      expect(refused).to.equal("rate_limited");

      // Restarting a screen the device already owns is not a fourth attempt — the supersede runs
      // first, so the device is taking its own slot back.
      const again = await AuthService.start({ purpose: "login", login: "79995551060", deviceId: device });
      expect(again.id).to.not.equal(login.id);

      // And an attempt that timed out is not holding anything either.
      await AuthAttempt.update({ deviceId: device, purpose: "verify:phone" } as any, { expiresAt: Date.now() - 1000 }).fetch();
      const freed = await AuthService.start({ purpose: "verify:link_identity", user: await owner("9995551064"), deviceId: device });
      expect(freed.id).to.be.a("string");
    });

    it("refusals are observable", async function () {
      const seen: any[] = [];
      getEmitter().on("core:auth-send-refused", "auth-test-refusals", (refusal: any) => {
        seen.push(refusal);
      });
      try {
        await setAllowedCountries(["RU"]);
        await AuthService.start({ purpose: "login", login: "380631234501", deviceId: "device-observable" });
      } finally {
        getEmitter().off("core:auth-send-refused", "auth-test-refusals");
      }

      const refusal = seen.find((r) => r && r.reason === "country");
      expect(refusal).to.exist;
      // A reason and nothing else: a phone number or a device id in a metric label is both
      // unbounded cardinality and PII on an endpoint somebody will eventually expose.
      expect(Object.keys(refusal)).to.deep.equal(["reason"]);
    });
  });
});
