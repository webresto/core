import { expect } from "chai";
import { registerDeviceTools } from "../../../../hook/mcp/devices";
import { DialogBox } from "../../../../lib/DialogBox";

/**
 * The MCP tools that say and ask something of a device: `device-message` hands a message to graphql
 * (`send-message`, the subscription `message`); `device-dialog` asks a DialogBox and returns the answer
 * of the device, or the default one when the window's time is out.
 */
describe("MCP device tools", function () {
  const tools = new Map<string, any>();
  let saved: { mcp: unknown; enabled: string | undefined };

  const sent: any[] = [];
  const asked: DialogBox[] = [];
  /** What the device answers; `null` — it stays silent. */
  let answer: string | null = null;

  before(function () {
    saved = { mcp: (global as any).mcp, enabled: process.env.MCP_ENABLED };
    (global as any).mcp = { registerTool: (tool: any) => tools.set(tool.name, tool), registerGroup: (): void => undefined };
    process.env.MCP_ENABLED = "true";
    registerDeviceTools();
    // One subscriber per event for the file: `emitter.off` does not unsubscribe.
    emitter.on("send-message", "device-tools-test", (message) => {
      sent.push(message);
    });
    emitter.on("dialog-box:new", "device-tools-test", (dialog: DialogBox) => {
      asked.push(dialog);
      const given = answer;
      if (given !== null) setTimeout(() => DialogBox.answerProcess(dialog.askId, given), 50);
    });
  });

  after(function () {
    answer = null;
    (global as any).mcp = saved.mcp;
    if (saved.enabled === undefined) delete process.env.MCP_ENABLED;
    else process.env.MCP_ENABLED = saved.enabled;
  });

  const call = (name: string, params: Record<string, unknown> = {}) => tools.get(name).handler(params, {});

  it("registers both tools, protected, in their group", function () {
    for (const name of ["device-message", "device-dialog"]) {
      expect(tools.get(name), name).to.include({ group: "devices", mode: "protected" });
    }
  });

  it("sends a message to the device, info by default", async function () {
    const result = await call("device-message", { deviceId: "device-1", title: "Title 1", message: "Message 1" });

    expect(result).to.deep.equal({ deviceId: "device-1", type: "info", title: "Title 1", message: "Message 1" });
    expect(sent[sent.length - 1]).to.include({ deviceId: "device-1", type: "info", title: "Title 1", message: "Message 1" });
  });

  it("asks the device and returns its answer", async function () {
    answer = "option-2";
    const result = await call("device-dialog", {
      deviceId: "device-1",
      title: "Title 1",
      message: "Message 1",
      allowClosing: false,
      options: [
        { id: "option-1", button: { label: "Button 1", type: "primary" } },
        { id: "option-2", button: { label: "Button 2", type: "abort" } },
      ],
    });

    expect(result.answerId).to.equal("option-2");
    const dialog = asked[asked.length - 1];
    expect(dialog.deviceId).to.equal("device-1");
    expect(dialog.config).to.include({ title: "Title 1", message: "Message 1", allowClosing: false, optionsType: "button" });
  });

  it("waits as long as the window lives and returns its default answer", async function () {
    this.timeout(5000);
    answer = null;
    const result = await call("device-dialog", { deviceId: "device-1", timeout: 1, defaultOptionId: "no" });

    expect(result.answerId).to.equal("no");
    expect(result.ms).to.be.within(1000, 2500);
    expect((asked[asked.length - 1].config.options as Array<{ id: string }>).map((option) => option.id)).to.deep.equal(["yes", "no"]);
  });
});
