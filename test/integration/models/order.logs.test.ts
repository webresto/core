import { expect } from "chai";
import { OrderRecord } from "../../../models/Order";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe("Order logs: beforeUpdate guard", function () {
  this.timeout(30000);

  let order: OrderRecord;

  beforeEach(async function () {
    order = await Order.create({ id: `logs-test-${Date.now()}-${Math.random()}` }).fetch();
  });

  it("Order.log persists entry in storage", async function () {
    await Order.log({ id: order.id }, "info", "test", "log message");

    const logs = await Order.getLogs({ id: order.id });
    const saved = logs.find((entry) => entry.message === "log message");
    expect(saved).to.exist;
    expect(saved.level).to.equal("info");
    expect(saved.module).to.equal("test");
  });

  it("normal Order.update with logs does not overwrite stored logs", async function () {
    const initialLogs = [
      { timestamp: new Date().toISOString(), level: "info" as const, module: "test", message: "existing log" },
    ];

    await (Order.update({ id: order.id }, { logs: initialLogs }) as any)
      .meta({ skipAllLifecycleCallbacks: true })
      .fetch();

    let fresh = await Order.findOne({ id: order.id });
    expect(fresh.logs).to.have.length(1);

    await Order.update({ id: order.id }, { comment: "updated", logs: [] } as any).fetch();

    fresh = await Order.findOne({ id: order.id });
    expect(fresh.logs).to.have.length(1);
    expect(fresh.logs[0].message).to.equal("existing log");
    expect(fresh.comment).to.equal("updated");
  });

  it("spread update does not overwrite stored logs", async function () {
    const initialLogs = [
      { timestamp: new Date().toISOString(), level: "warn" as const, module: "test", message: "log 1" },
      { timestamp: new Date().toISOString(), level: "error" as const, module: "test", message: "log 2" },
    ];

    await (Order.update({ id: order.id }, { logs: initialLogs }) as any)
      .meta({ skipAllLifecycleCallbacks: true })
      .fetch();

    const orderWithLogs = await Order.findOne({ id: order.id });
    expect(orderWithLogs.logs).to.have.length(2);

    await Order.update({ id: order.id }, { ...orderWithLogs, comment: "after spread" } as any).fetch();

    const fresh = await Order.findOne({ id: order.id });
    expect(fresh.logs).to.have.length(2);
    expect(fresh.comment).to.equal("after spread");
  });

  it("Order.emitAndLogDetached logs handler errors without awaiting the caller", async function () {
    const listenerId = `detached-error-${order.id}`;
    emitter.on("core:order-after-done", listenerId, async function () {
      throw new Error("detached test error");
    });

    try {
      Order.emitAndLogDetached({ id: order.id }, "core:order-after-done", order, null, { isNewUser: false });

      let saved;
      for (let i = 0; i < 20; i++) {
        const logs = await Order.getLogs({ id: order.id });
        saved = logs.find((entry) => entry.message === "Emitter [core:order-after-done] handler error");
        if (saved) break;
        await sleep(50);
      }

      expect(saved).to.exist;
      expect(saved.level).to.equal("error");
      expect(saved.module).to.equal(listenerId);
      expect(saved.data.error).to.equal("detached test error");
    } finally {
      emitter.on("core:order-after-done", listenerId, function () {});
    }
  });
});
