import { expect } from "chai";
import { resetDatabase } from "../../support/reset";
import { newBasket } from "../../support/storefront";

/**
 * An order's journal: `Order.log` appends to it, an ordinary update of the
 * order cannot overwrite it, and a subscriber that fails on a detached event
 * leaves its error there.
 */
describe("Order log", function () {
  let id: string;

  before(async function () {
    await resetDatabase();
  });

  beforeEach(async function () {
    id = await newBasket();
  });

  /** Journal entries written straight into the row, past the guard. */
  const seed = (logs: { level: string; message: string }[]) =>
    (Order.update({ id }, { logs: logs.map((entry) => ({ timestamp: new Date().toISOString(), module: "test", ...entry })) }) as any)
      .meta({ skipAllLifecycleCallbacks: true })
      .fetch();

  it("Order.log appends an entry with its level and module", async function () {
    await Order.log({ id }, "info", "module-1", "Message 1");

    const entry = (await Order.getLogs({ id })).find((logged) => logged.message === "Message 1");
    expect(entry).to.include({ level: "info", module: "module-1" });
  });

  it("an update that carries logs, empty or spread from the row, does not overwrite them", async function () {
    await seed([{ level: "warn", message: "Message 1" }, { level: "error", message: "Message 2" }]);

    await Order.update({ id }, { comment: "Comment 1", logs: [] } as any).fetch();
    let order = await Order.findOne({ id });
    expect(order.logs.map((entry: any) => entry.message)).to.deep.equal(["Message 1", "Message 2"]);
    expect(order.comment).to.equal("Comment 1");

    await Order.update({ id }, { ...order, comment: "Comment 2" } as any).fetch();
    order = await Order.findOne({ id });
    expect(order.logs).to.have.length(2);
    expect(order.comment).to.equal("Comment 2");
  });

  it("a subscriber that fails on a detached event leaves its error in the journal", async function () {
    const subscriber = "order-log-test";
    emitter.on("core:order-after-done", subscriber, async () => {
      throw new Error("Error 1");
    });

    try {
      Order.emitAndLogDetached({ id }, "core:order-after-done", await Order.findOne({ id }), null, { isNewUser: false });

      let entry: any;
      for (let attempt = 0; attempt < 20 && !entry; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 50));
        entry = (await Order.getLogs({ id })).find((logged) => logged.message === "Emitter [core:order-after-done] handler error");
      }

      expect(entry).to.include({ level: "error", module: subscriber });
      expect(entry.data.error).to.equal("Error 1");
    } finally {
      // `emitter.off` does not unsubscribe; a subscriber that does nothing replaces this one.
      emitter.on("core:order-after-done", subscriber, () => undefined);
    }
  });
});
