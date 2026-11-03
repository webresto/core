import { expect } from "chai";
import * as fs from "fs";
import * as path from "path";

/**
 * The rule of C2: **every path that writes `Order.state` writes the order's stops too.**
 *
 * A point's board — the web one and the phone's — finds its orders through `order_stop`. A
 * transition that moves an order without calling `syncOrderStops` leaves the stop behind: the order
 * disappears from the board it belongs to, or stays on the board it has left, and nothing fails
 * loudly. There is no linter in this project, so this test is the rule.
 *
 * Only two places in core write the state: `Order.order`, which places a basket, and `Order.next`,
 * which every other transition — `doFinalize` included — goes through. Both are checked by name
 * here: a third one has to be added to this test on purpose, with its own call to the sync.
 */
describe("Order stops follow every state write", function () {
  const CORE = path.resolve(__dirname, "../../../..");
  const SKIP = new Set(["test", "node_modules", ".git", ".tsc-models-out", "build", "assets", "docs"]);

  /** Every TypeScript source of core, models included; the generated `.js`/`.d.ts` are artifacts. */
  function sources(dir: string): string[] {
    return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      if (entry.isDirectory()) return SKIP.has(entry.name) || entry.name.startsWith(".") ? [] : sources(path.join(dir, entry.name));
      return entry.name.endsWith(".ts") && !entry.name.endsWith(".d.ts") ? [path.join(dir, entry.name)] : [];
    });
  }

  /** Lines that write a state into the `order` model — `Order.update(…, {state: …})` and friends. */
  function stateWrites(text: string): number[] {
    const lines = text.split("\n");
    const writes: number[] = [];
    lines.forEach((line, index) => {
      const near = lines.slice(Math.max(0, index - 6), index + 1).join(" ");
      const writesState = /\bstate\s*:\s*("|'|`)?(NEW|CART|CHECKOUT|PAYMENT|ORDER|COOKING|ON_THE_WAY|DONE|REJECT)\1?\s*(,|}|$)/.test(line)
        || /\bstate\s*:\s*(nextState|state)\b/.test(line);
      // A write is either the call itself, or the patch object a call a few lines down takes.
      const inWrite = /Order\.(update|updateOne|create|createEach)\b/.test(near)
        || /Partial<OrderRecord>\s*=\s*\{/.test(near)
        || /\bpatch\b.*=\s*\{/.test(near);
      // A `where` is a read: it names a state to select by, not to write.
      const isWhere = /\b(where|find|count|destroy|criteria)\b/.test(near) && !/Order\.(update|updateOne|create)\b/.test(near);
      if (writesState && inWrite && !isWhere) writes.push(index + 1);
    });
    return writes;
  }

  it("writes the state in two places only, and both write the stops", function () {
    const found: Array<{ file: string; line: number; synced: boolean }> = [];

    for (const file of sources(CORE)) {
      const text = fs.readFileSync(file, "utf8");
      if (!/\bOrder\.(update|updateOne|create|createEach)\b/.test(text)) continue;
      const lines = text.split("\n");
      for (const line of stateWrites(text)) {
        // The sync may stand a few lines below the write — after the log, the emit, the RMS call.
        const after = lines.slice(line - 1, line + 30).join("\n");
        found.push({ file: path.relative(CORE, file), line, synced: /syncOrderStops\(/.test(after) });
      }
    }

    expect(found.map((write) => write.file), JSON.stringify(found, null, 1)).to.deep.equal(["models/Order.ts", "models/Order.ts"]);
    expect(found.filter((write) => !write.synced), "a state write without syncOrderStops next to it").to.deep.equal([]);
  });

  it("gives the kitchen assignment its own call, since it moves the stop without a state write", function () {
    const assign = fs.readFileSync(path.join(CORE, "lib/order/assignKitchen.ts"), "utf8");

    expect(/syncOrderStops\(/.test(assign), "assignOrderKitchen must move the stop it reassigns").to.equal(true);
  });

  it("keeps the selection of a point's orders on the stops, not on a window of the whole chain", function () {
    const selection = fs.readFileSync(path.join(CORE, "lib/order/orders-of-place.ts"), "utf8");

    expect(/OrderStop\.find/.test(selection), "ordersOfPlace must query the stops").to.equal(true);
    expect(/Order\.find!\(\{\s*where:\s*tabWhere/.test(selection), "the in-memory window is gone").to.equal(false);
  });
});
