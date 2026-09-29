import { expect } from "chai";
import { DialogBox } from "../../../../lib/DialogBox";
import { DialogBoxConfig } from "../../../../interfaces/DialogBox";

/**
 * A question core asks a device: `ask` announces the dialog on the event bus
 * and waits; the answer that comes back for its `askId` is what `ask` returns,
 * and no answer in time is `null`.
 */
describe("Dialog box", function () {
  const config: DialogBoxConfig = {
    message: "Message 1",
    title: "Title 1",
    optionsType: "button",
    options: [
      { id: "option-1", button: { label: "Button 1", type: "primary" } },
      { id: "option-2", button: { label: "Button 2", type: "secondary" } },
    ],
  };

  /** What the device answers; `null` — it stays silent. */
  let answer: string | null = null;

  before(function () {
    // One subscriber for the file: `emitter.off` does not unsubscribe, so a
    // subscriber per test would outlive its test.
    emitter.on("dialog-box:new", "dialog-box-test", (dialog: DialogBox) => {
      const given = answer;
      if (given !== null) setTimeout(() => DialogBox.answerProcess(dialog.askId, given), 50);
    });
  });

  it("returns the option the device answered with", async function () {
    answer = "option-2";
    expect(await DialogBox.ask(config, "device-1")).to.equal("option-2");
  });

  it("returns null when no answer comes in time", async function () {
    answer = null;
    expect(await DialogBox.ask(config, "device-1", 300)).to.equal(null);
  });
});
