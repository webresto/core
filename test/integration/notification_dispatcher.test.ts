import { NotificationDispatcher } from "../../libs/NotificationDispatcher";
import { Channel, NotificationManager } from "../../libs/NotificationManager";

const NotificationModel = () => (globalThis as any).Notification;

class StubChannel extends Channel {
  public forceSend: boolean = false;
  public forGroupTo: string[] = ["user"];
  public sortOrder: number;
  public cost: number = 0;
  public type: string;
  public sendCount: number = 0;
  public failNext: boolean = false;
  public delayMs: number = 0;
  public lastData: any = null;

  constructor(type: string, sortOrder: number) {
    super();
    this.type = type;
    this.sortOrder = sortOrder;
  }

  protected async send(_badge: any, _message: any, _user: any, _subject?: any, data?: any): Promise<void> {
    if (this.delayMs > 0) await new Promise((resolve) => setTimeout(resolve, this.delayMs));
    if (this.failNext) {
      this.failNext = false;
      throw new Error("stub channel failure");
    }
    this.lastData = data;
    this.sendCount += 1;
  }
}

describe("NotificationDispatcher", function () {
  this.timeout(20000);

  const stubA = new StubChannel("stub-a", 1);
  const stubB = new StubChannel("stub-b", 2);
  let channelsBackup: Channel[] = [];
  let userId: string;

  before(async () => {
    channelsBackup = [...NotificationManager.channels];
    NotificationManager.channels.length = 0;
    NotificationManager.registerChannel(stubA);
    NotificationManager.registerChannel(stubB);
    const user = await User.create({
      login: "dispatcher-test-user",
      firstName: "Dispatcher",
      phone: { code: "+7", number: "9990001122" },
    } as any).fetch();
    userId = user.id;
  });

  after(() => {
    // The channels registry is a shared global; restore it for the other test files.
    NotificationManager.channels.length = 0;
    NotificationManager.channels.push(...channelsBackup);
  });

  it("deduplicates sends by idempotencyKey + type", async () => {
    const first = await NotificationDispatcher.send({
      user: userId,
      title: "dedup",
      body: "dedup body",
      notificationTypeKey: "dedup_type",
      idempotencyKey: "dedup-key-1",
    });
    const second = await NotificationDispatcher.send({
      user: userId,
      title: "dedup",
      body: "dedup body",
      notificationTypeKey: "dedup_type",
      idempotencyKey: "dedup-key-1",
    });
    if (second.id !== first.id) throw new Error(`expected the same notification, got ${first.id} / ${second.id}`);
    const records = await NotificationModel().find({ idempotencyKey: "dedup-key-1" });
    if (records.length !== 1) throw new Error(`expected 1 record, got ${records.length}`);
  });

  it("falls back to persisted requestedChannels on recovery delivery", async () => {
    const record = await NotificationModel().create({
      user: userId,
      title: "recovery",
      body: "recovery body",
      groupTo: "user",
      status: "pending",
      requestedChannels: ["stub-b"],
    }).fetch();

    const sentABefore = stubA.sendCount;
    const sentBBefore = stubB.sendCount;
    // Recovery path: the delivery loop calls _deliver without explicit channelTypes.
    await NotificationDispatcher._deliver(record);

    if (stubA.sendCount !== sentABefore) throw new Error("stub-a must be filtered out by requestedChannels");
    if (stubB.sendCount !== sentBBefore + 1) throw new Error("stub-b must deliver the recovered notification");
    const updated = await NotificationModel().findOne({ id: record.id });
    if (updated.status !== "sent") throw new Error(`expected sent, got ${updated.status}`);
    if (!updated.channels?.length || updated.channels[0].type !== "stub-b") {
      throw new Error(`expected channels [stub-b], got ${JSON.stringify(updated.channels)}`);
    }
  });

  it("keeps canonical data when create returns JSON strings", async () => {
    const originalCreate = NotificationModel().create.bind(NotificationModel());
    (NotificationModel() as any).create = (values: any) => ({
      fetch: async () => {
        const record = await originalCreate(values).fetch();
        if (record.data && typeof record.data === "object") {
          record.data = JSON.stringify(record.data) as any;
        }
        if (record.context && typeof record.context === "object") {
          record.context = JSON.stringify(record.context) as any;
        }
        return record;
      },
    });

    const sentBefore = stubA.sendCount;
    try {
      const notification = await NotificationDispatcher.send({
        title: "otp",
        body: "code",
        groupTo: "user",
        channelTypes: ["stub-a"],
        data: {
          eventKey: "user_otp_requested",
          recipient: {},
          context: { user: { phone: "79000000000" }, otp: { code: "123456" } },
        },
        context: { user: { phone: "79000000000" }, otp: { code: "123456" } },
      });

      if (stubA.sendCount !== sentBefore + 1) throw new Error("stub-a must receive the notification");
      if (stubA.lastData?.context?.user?.phone !== "79000000000") {
        throw new Error(`expected channel data to keep context.user.phone, got ${JSON.stringify(stubA.lastData)}`);
      }

      const persisted = await NotificationModel().findOne({ id: notification.id });
      const persistedData = typeof persisted.data === "string" ? JSON.parse(persisted.data) : persisted.data;
      if (persistedData?.context?.user?.phone !== "79000000000") {
        throw new Error(`expected persisted data to keep context.user.phone, got ${JSON.stringify(persistedData)}`);
      }
      if (persistedData?.notificationId !== notification.id) {
        throw new Error(`expected notificationId in persisted data, got ${JSON.stringify(persistedData)}`);
      }
    } finally {
      (NotificationModel() as any).create = originalCreate;
    }
  });

  it("claims the record atomically: concurrent _deliver sends only once", async () => {
    const record = await NotificationModel().create({
      user: userId,
      title: "claim",
      body: "claim body",
      groupTo: "user",
      status: "pending",
    }).fetch();

    const copyOne = await NotificationModel().findOne({ id: record.id });
    const copyTwo = await NotificationModel().findOne({ id: record.id });
    const sentBefore = stubA.sendCount + stubB.sendCount;

    stubA.delayMs = 30;
    try {
      await Promise.all([
        NotificationDispatcher._deliver(copyOne),
        NotificationDispatcher._deliver(copyTwo),
      ]);
    } finally {
      stubA.delayMs = 0;
    }

    const sentAfter = stubA.sendCount + stubB.sendCount;
    if (sentAfter !== sentBefore + 1) {
      throw new Error(`expected exactly 1 delivery, got ${sentAfter - sentBefore}`);
    }
  });

  it("escalates to the next unused channel, then terminates with escalationExhausted", async () => {
    const record = await NotificationModel().create({
      user: userId,
      title: "escalation",
      body: "escalation body",
      groupTo: "user",
      status: "sent",
      channels: [{ type: "stub-a", cost: 0, sentAt: Date.now() }],
      deliveryAttempts: 1,
    }).fetch();

    const sentBBefore = stubB.sendCount;
    await NotificationDispatcher._deliverNextChannel(record);

    let updated = await NotificationModel().findOne({ id: record.id });
    if (stubB.sendCount !== sentBBefore + 1) throw new Error("escalation must use the unused stub-b channel");
    if (updated.escalationExhausted) throw new Error("record must stay escalation-eligible after a successful escalation");
    if (updated.channels.length !== 2) throw new Error(`expected 2 channel entries, got ${updated.channels.length}`);

    // Second pass: no unused channels remain — must terminate permanently.
    await NotificationDispatcher._deliverNextChannel(updated);
    updated = await NotificationModel().findOne({ id: record.id });
    if (updated.escalationExhausted !== true) throw new Error("record must be marked escalationExhausted when nothing is left to try");
  });

  it("stops escalation when the notification was delivered by a terminal channel", async () => {
    // Messenger/bot channels get no read receipt: a delivered message must end the
    // waterfall, otherwise every free delivery is duplicated by a paid channel.
    stubA.stopEscalation = true;
    try {
      const record = await NotificationModel().create({
        user: userId,
        title: "terminal",
        body: "terminal body",
        groupTo: "user",
        status: "sent",
        channels: [{ type: "stub-a", cost: 0, sentAt: Date.now() }],
        deliveryAttempts: 1,
      }).fetch();

      const sentBefore = stubA.sendCount + stubB.sendCount;
      await NotificationDispatcher._deliverNextChannel(record);

      const updated = await NotificationModel().findOne({ id: record.id });
      if (updated.escalationExhausted !== true) throw new Error("terminal delivery must end the escalation");
      if (stubA.sendCount + stubB.sendCount !== sentBefore) throw new Error("terminal delivery must not attempt another channel");
    } finally {
      stubA.stopEscalation = false;
    }
  });

  it("closes the record for escalation as soon as a terminal channel delivers it", async () => {
    stubA.stopEscalation = true;
    try {
      const notification = await NotificationDispatcher.send({
        user: userId,
        title: "terminal delivery",
        body: "terminal delivery body",
        channelTypes: ["stub-a"],
      });

      if (notification.status !== "sent") throw new Error(`expected status sent, got ${notification.status}`);
      if (notification.escalationExhausted !== true) throw new Error("a terminal channel delivery must set escalationExhausted");
    } finally {
      stubA.stopEscalation = false;
    }
  });

  it("marks device-targeted (userless) notifications exhausted without escalation attempts", async () => {
    const record = await NotificationModel().create({
      title: "guest",
      body: "guest body",
      groupTo: "user",
      status: "sent",
      channels: [{ type: "stub-a", cost: 0, sentAt: Date.now() }],
      deliveryAttempts: 1,
    }).fetch();

    const sentBefore = stubA.sendCount + stubB.sendCount;
    await NotificationDispatcher._deliverNextChannel(record);

    const updated = await NotificationModel().findOne({ id: record.id });
    if (updated.escalationExhausted !== true) throw new Error("guest notification must be terminal for escalation");
    if (stubA.sendCount + stubB.sendCount !== sentBefore) throw new Error("guest escalation must not attempt any channel");
  });
});
