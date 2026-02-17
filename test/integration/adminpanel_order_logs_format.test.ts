import { expect } from "chai";
import {
  filterOrderLogs,
  normalizeOrderLogs,
  summarizeOrderLogs,
} from "../../libs/adminpanel/controls/orderLogsViewerHelper";

describe("adminpanel Order logs viewer helper", function () {
  it("normalizes logs and keeps expected fields", function () {
    const logs = normalizeOrderLogs([
      {
        timestamp: "2026-01-01T10:00:00.000Z",
        level: "info",
        module: "core",
        message: "Order created",
      },
      {
        timestamp: "2026-01-01T10:02:00.000Z",
        level: "error",
        module: "payment",
        message: "Gateway timeout",
      },
    ]);

    expect(logs).to.have.length(2);
    expect(logs[0].level).to.equal("info");
    expect(logs[1].level).to.equal("error");
  });

  it("filters logs by levels and search", function () {
    const normalized = normalizeOrderLogs([
      { timestamp: "2026-01-01", level: "debug", module: "core", message: "step-1" },
      { timestamp: "2026-01-01", level: "error", module: "payment", message: "timeout" },
    ]);

    const filteredByLevel = filterOrderLogs(normalized, new Set(["error"]), "");
    expect(filteredByLevel).to.have.length(1);
    expect(filteredByLevel[0].level).to.equal("error");

    const filteredBySearch = filterOrderLogs(normalized, new Set(["debug", "error", "info", "warn"]), "timeout");
    expect(filteredBySearch).to.have.length(1);
    expect(filteredBySearch[0].message).to.equal("timeout");
  });

  it("returns level summary for list view", function () {
    const summary = summarizeOrderLogs([
      { timestamp: "1", level: "debug", module: "core", message: "d" },
      { timestamp: "2", level: "info", module: "core", message: "i" },
      { timestamp: "3", level: "warn", module: "core", message: "w" },
      { timestamp: "4", level: "error", module: "core", message: "e" },
    ]);

    expect(summary).to.equal("debug:1 info:1 warn:1 error:1");
    expect(summarizeOrderLogs(undefined)).to.equal("Нет логов");
  });
});
