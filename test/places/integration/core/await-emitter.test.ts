import { expect } from "chai";
import AwaitEmitter from "../../../../lib/AwaitEmitter";

/**
 * Core's event bus: `emit` waits for every subscriber and reports each one's
 * outcome — its result, its error, or that it ran out of time — instead of
 * throwing. A subscriber is known by its id, so subscribing again replaces it.
 */
describe("Await emitter", function () {
  // An event of core's own, on a private instance: nothing else listens.
  const EVENT = "core:order-after-count";
  const order = { id: "order-1" } as any;

  it("answers an event nobody listens to with nothing", async function () {
    expect(await new AwaitEmitter().emit(EVENT, order)).to.deep.equal([]);
  });

  it("waits for every subscriber, plain and async, and hands each the arguments", async function () {
    const emitter = new AwaitEmitter();
    const seen: unknown[] = [];
    emitter.on(EVENT, "subscriber-1", (received: any) => {
      seen.push(received);
      return "result 1";
    });
    emitter.on(EVENT, "subscriber-2", async () => "result 2");

    const results = await emitter.emit(EVENT, order);

    expect(seen).to.deep.equal([order]);
    expect(results.map(({ id, state, result }) => ({ id, state, result }))).to.have.deep.members([
      { id: "subscriber-1", state: "success", result: "result 1" },
      { id: "subscriber-2", state: "success", result: "result 2" },
    ]);
  });

  it("replaces a subscriber that subscribes again under the same id", async function () {
    const emitter = new AwaitEmitter();
    emitter.on(EVENT, "subscriber-1", () => "first");
    emitter.on(EVENT, "subscriber-1", () => "second");

    const results = await emitter.emit(EVENT, order);

    expect(results.map((response) => response.result)).to.deep.equal(["second"]);
  });

  it("reports a subscriber that failed, and one that ran out of time, without stopping the rest", async function () {
    const emitter = new AwaitEmitter();
    emitter.on(EVENT, "failing", async () => {
      throw new Error("failed");
    });
    emitter.on(EVENT, "slow", () => new Promise((resolve) => setTimeout(() => resolve("late"), 200)));
    emitter.on(EVENT, "fine", () => "done");

    // The last number is the timeout, in milliseconds.
    const results = await emitter.emit(EVENT, order, 20);
    const byId = Object.fromEntries(results.map((response) => [response.id, response]));

    expect(byId.failing.state).to.equal("error");
    expect(byId.failing.error.message).to.equal("failed");
    expect(byId.slow.state).to.equal("timeout");
    expect(byId.fine).to.include({ state: "success", result: "done" });
  });
});
