import { expect } from "chai";
import AuthService from "../../../../lib/AuthService";
import { Channel, NotificationManager } from "../../../../lib/notifications/NotificationManager";
import { NotificationTypeRegistry } from "../../../../lib/notifications/NotificationTypeRegistry";
import { resetDatabase } from "../../support/reset";

/**
 * Asking for the code again before the pause between two codes is over («Назад» → «Сообщение с кодом»): the same
 * device gets its live attempt back — the code already delivered still opens it, nothing is refused. Another number,
 * or the same one after the pause, opens a new attempt.
 */
describe("Auth restart within the pause", function () {
  class SmsChannel extends Channel {
    public type = "sms";
    public forceSend = false;
    public forGroupTo = ["user"];
    public sortOrder = 0;
    public cost = 0;
    public sent: string[] = [];
    protected async send(): Promise<void> {
      this.sent.push("sms");
    }
  }
  const sms = new SmsChannel();

  before(async function () {
    NotificationManager.registerChannel(sms);
    await NotificationTypeRegistry.load();
  });
  after(function () {
    NotificationManager.channels.splice(NotificationManager.channels.indexOf(sms), 1);
  });
  beforeEach(async function () {
    await resetDatabase();
  });

  const start = (login: string, deviceId = "device-1") => AuthService.start({ purpose: "login", login, deviceId });

  it("hands the live attempt back, and its code still opens it", async function () {
    const first = await start("15550000011");
    expect(first.sentAt, "the first code went out").to.be.a("number");

    const second = await start("15550000011");

    expect(second.id).to.equal(first.id);
    expect(second.failReason ?? null).to.equal(null);
    expect(second.secret).to.equal(first.secret);
  });

  it("opens a new attempt for another number", async function () {
    const first = await start("15550000012");
    const second = await start("15550000013");

    expect(second.id).to.not.equal(first.id);
  });

  it("opens a new attempt once the pause is over", async function () {
    const first = await start("15550000014");
    await AuthAttempt.update!({ id: first.id }, { sentAt: Date.now() - 61_000 }).fetch();

    const second = await start("15550000014");

    expect(second.id).to.not.equal(first.id);
  });
});
