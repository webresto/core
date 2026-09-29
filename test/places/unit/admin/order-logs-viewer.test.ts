import { expect } from "chai";
import { filterOrderLogs, normalizeOrderLogs, summarizeOrderLogs } from "../../../../lib/adminpanel/controls/orderLogsViewerHelper";

/** The admin's viewer of an order's journal: entries read, filtered by level and text, summed up for the list. */
describe("Order logs viewer", function () {
  const logs = normalizeOrderLogs([
    { timestamp: "2026-01-01T10:00:00.000Z", level: "debug", module: "core", message: "Message 1" },
    { timestamp: "2026-01-01T10:02:00.000Z", level: "error", module: "payment", message: "Message 2" },
  ]);

  it("reads the entries with their levels", function () {
    expect(logs.map((entry) => entry.level)).to.deep.equal(["debug", "error"]);
  });

  it("filters by level and by text", function () {
    expect(filterOrderLogs(logs, new Set(["error"]), "").map((entry) => entry.message)).to.deep.equal(["Message 2"]);
    expect(filterOrderLogs(logs, new Set(["debug", "error", "info", "warn"]), "message 1").map((entry) => entry.message)).to.deep.equal(["Message 1"]);
  });

  it("counts entries by level for the list column", function () {
    const all = ["debug", "info", "warn", "error"].map((level, at) => ({ timestamp: String(at), level, module: "core", message: level }));
    expect(summarizeOrderLogs(all as any)).to.equal("debug:1 info:1 warn:1 error:1");
    expect(summarizeOrderLogs(undefined)).to.equal("Нет логов");
  });
});
