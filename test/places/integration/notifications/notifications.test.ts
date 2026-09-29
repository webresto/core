import { expect } from "chai";
import { NotificationDispatcher } from "../../../../lib/notifications/NotificationDispatcher";
import { NotificationTypeRegistry } from "../../../../lib/notifications/NotificationTypeRegistry";
import { Channel, NotificationManager } from "../../../../lib/notifications/NotificationManager";
import { resetDatabase } from "../../support/reset";

/** The model, read once Sails has lifted; the name `Notification` is the DOM's to the compiler. */
const notifications = () => (globalThis as any).Notification;

/**
 * Notifications: a message goes out through the channels registered with core,
 * cheapest first. The dispatcher sends a notification once per idempotency key,
 * delivers a pending one through the channels it asked for, sends a record only
 * once even when two workers pick it up, and escalates an unread one to the next
 * unused channel — unless a channel that ends the waterfall (a messenger) already
 * delivered it, or there is no user to reach.
 */
describe("Notifications", function () {
  class TestChannel extends Channel {
    public forceSend = false;
    public forGroupTo = ["user"];
    public cost = 0;
    public sent: Array<{ message: string; data: any }> = [];
    public delayMs = 0;

    constructor(public type: string, public sortOrder: number) {
      super();
    }

    protected async send(_badge: any, message: string, _user: any, _subject?: any, data?: any): Promise<void> {
      if (this.delayMs) await new Promise((resolve) => setTimeout(resolve, this.delayMs));
      this.sent.push({ message, data });
    }
  }

  const channel1 = new TestChannel("channel-1", 1);
  const channel2 = new TestChannel("channel-2", 2);
  const registered: Channel[] = [];
  let user: string;

  before(async function () {
    await resetDatabase();
    // The registry is process-wide: this file's channels only, put back after.
    registered.push(...NotificationManager.channels);
    NotificationManager.channels.length = 0;
    NotificationManager.registerChannel(channel1);
    NotificationManager.registerChannel(channel2);
    user = (await User.create({ login: "15550000001", firstName: "Customer", lastName: "1", phone: { code: "1", number: "5550000001" } }).fetch()).id;
  });

  after(function () {
    NotificationManager.channels.length = 0;
    NotificationManager.channels.push(...registered);
  });

  beforeEach(function () {
    channel1.sent = [];
    channel2.sent = [];
  });

  const sentCount = () => channel1.sent.length + channel2.sent.length;
  const record = (values: Record<string, unknown>) =>
    notifications().create({ user, title: "Title 1", body: "Body 1", groupTo: "user", ...values }).fetch();
  const reread = async (id: string) => notifications().findOne({ id });

  describe("the manager", function () {
    it("knows its channels by type and sends a message through the first", async function () {
      expect(NotificationManager.isChannelExist("channel-1")).to.equal(true);
      expect(NotificationManager.isChannelExist("channel-9")).to.equal(false);

      await NotificationManager.send("info", "user", "Message 1", null);
      expect(channel1.sent.map((sent) => sent.message)).to.include("Message 1");
    });

    it("carries a login code by SMS once its rule is on; out of the box the rule is off", async function () {
      const sms = new TestChannel("sms", 0);
      NotificationManager.registerChannel(sms);
      const rule = await NotificationRules.findOne({ key: "user_otp_sms" });
      expect(rule.enabled).to.equal(false);

      await NotificationRules.update({ key: "user_otp_sms" }, { enabled: true }).fetch();
      await NotificationTypeRegistry.load();
      try {
        const otp = await (await Adapter.getOTPAdapter()).get("15550000001");
        let body = "";
        for (let attempt = 0; attempt < 20 && !body; attempt++) {
          await new Promise((resolve) => setTimeout(resolve, 50));
          body = sms.sent.map((sent) => sent.message).join(" ");
        }
        expect(body).to.contain(otp.password);
      } finally {
        await NotificationRules.update({ key: "user_otp_sms" }, { enabled: false }).fetch();
        await NotificationTypeRegistry.load();
        NotificationManager.channels.splice(NotificationManager.channels.indexOf(sms), 1);
      }
    });
  });

  describe("the dispatcher", function () {
    it("sends once per idempotency key and type", async function () {
      const message = { user, title: "Title 1", body: "Body 1", notificationTypeKey: "type_1", idempotencyKey: "key-1" };
      const first = await NotificationDispatcher.send(message);
      const second = await NotificationDispatcher.send(message);

      expect(second.id).to.equal(first.id);
      expect(await notifications().count({ idempotencyKey: "key-1" })).to.equal(1);
    });

    it("delivers a pending record through the channels it asked for", async function () {
      const pending = await record({ status: "pending", requestedChannels: ["channel-2"] });

      // The delivery loop's path: no explicit channels, the record's own.
      await NotificationDispatcher._deliver(pending);

      expect(channel1.sent).to.have.length(0);
      expect(channel2.sent).to.have.length(1);
      const updated = await reread(pending.id);
      expect(updated.status).to.equal("sent");
      expect(updated.channels.map((sent: any) => sent.type)).to.deep.equal(["channel-2"]);
    });

    it("keeps the data it sends and stores, even from a datastore that gives JSON back as text", async function () {
      // PostgreSQL json-over-text columns come back as strings; this one does too.
      const model = notifications();
      const create = model.create.bind(model);
      model.create = (values: any) => ({
        fetch: async () => {
          const created = await create(values).fetch();
          for (const key of ["data", "context"]) if (created[key] && typeof created[key] === "object") created[key] = JSON.stringify(created[key]);
          return created;
        },
      });
      try {
        const context = { user: { phone: "15550000001" }, otp: { code: "123456" } };
        const notification = await NotificationDispatcher.send({
          title: "Title 1", body: "Body 1", groupTo: "user", channelTypes: ["channel-1"],
          data: { eventKey: "user_otp_requested", recipient: {}, context }, context,
        });

        expect(channel1.sent[0].data.context.user.phone).to.equal("15550000001");
        const persisted = await reread(notification.id);
        const data = typeof persisted.data === "string" ? JSON.parse(persisted.data) : persisted.data;
        expect(data.context.user.phone).to.equal("15550000001");
        expect(data.notificationId).to.equal(notification.id);
      } finally {
        model.create = create;
      }
    });

    it("sends a record once when two workers pick it up at the same time", async function () {
      const pending = await record({ status: "pending" });
      const [one, two] = [await reread(pending.id), await reread(pending.id)];
      channel1.delayMs = 30;
      try {
        await Promise.all([NotificationDispatcher._deliver(one), NotificationDispatcher._deliver(two)]);
      } finally {
        channel1.delayMs = 0;
      }
      expect(sentCount()).to.equal(1);
    });

    describe("escalation", function () {
      const sentBy = (type: string) => ({ status: "sent", channels: [{ type, cost: 0, sentAt: Date.now() }], deliveryAttempts: 1 });

      it("goes to the next unused channel, then ends when none is left", async function () {
        const unread = await record(sentBy("channel-1"));

        await NotificationDispatcher._deliverNextChannel(unread);
        let updated = await reread(unread.id);
        expect(channel2.sent).to.have.length(1);
        expect(updated.escalationExhausted).to.not.equal(true);
        expect(updated.channels).to.have.length(2);

        await NotificationDispatcher._deliverNextChannel(updated);
        updated = await reread(unread.id);
        expect(updated.escalationExhausted).to.equal(true);
      });

      it("ends when a channel that ends the waterfall delivered it, and says so at once on sending", async function () {
        // A messenger gives no read receipt: a delivered message must end the
        // waterfall, or every free delivery is duplicated by a paid channel.
        (channel1 as any).stopEscalation = true;
        try {
          const unread = await record(sentBy("channel-1"));
          await NotificationDispatcher._deliverNextChannel(unread);
          expect((await reread(unread.id)).escalationExhausted).to.equal(true);
          expect(sentCount()).to.equal(0);

          const notification = await NotificationDispatcher.send({ user, title: "Title 1", body: "Body 1", channelTypes: ["channel-1"] });
          expect(notification).to.include({ status: "sent", escalationExhausted: true });
        } finally {
          (channel1 as any).stopEscalation = false;
        }
      });

      it("ends at once for a notification with no user to reach", async function () {
        const guest = await notifications().create({ title: "Title 1", body: "Body 1", groupTo: "user", ...sentBy("channel-1") }).fetch();

        await NotificationDispatcher._deliverNextChannel(guest);

        expect((await reread(guest.id)).escalationExhausted).to.equal(true);
        expect(sentCount()).to.equal(0);
      });
    });
  });
});
