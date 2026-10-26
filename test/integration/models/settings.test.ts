import { expect } from "chai";

describe("Settings", function () {

  it("Get from memory", async function () {
    await sleep(1000);
    await Settings.set("projectName", {key: "projectName", value: "test"});
    let setting = await Settings.get("projectName");
    expect(setting).to.equal("test")
  });

  it("Get from memory afterCreate", async function () {
    await Settings.set("test", {key: "test", value: {test: true}, jsonSchema: {
        type: "object",
        properties: {
          test: {
            type: "boolean"
          }
        }
      }});
    let setting = await Settings.get("test") as unknown as {test: boolean};
    expect(setting.test).to.equal(true)
  });

  it("Get from memory afterUpdate", async function () {
    await Settings.set("test", {key: "test", value: {test: false}, jsonSchema: {
        type: "object",
        properties: {
          test: {
            type: "boolean"
          }
        }
      }});
    let setting = await Settings.get("test");
    expect(setting.test).to.equal(false)
  });

  // Deprecated, Settings.set does not write values to process.env anymore
  // it("Should set process.env", async function () {
  //   await Settings.set("test_123Test", {key: "test_123Test", value: true});
  //   expect(process.env.TEST_123_TEST).to.equal('true')
  // });

  describe("mirrorToEnv", function () {
    const key = "MIRROR_TEST_TZ";
    // Not mirrored by the app before, as an operator env var would be
    const pinnedKey = "MIRROR_TEST_TZ_PINNED";
    afterEach(function () {
      delete process.env[key];
      delete process.env[pinnedKey];
    });

    it("a value the app copies into process.env is not an ENV pin", async function () {
      const saved = await Settings.set(key as any, { key, value: "Europe/Moscow" });
      expect(Settings.mirrorToEnv(key as any, "Europe/Moscow")).to.equal(true);
      expect(process.env[key]).to.equal("Europe/Moscow");
      expect(Settings.envOverride(saved).active).to.equal(false);

      // The DB stays the source of truth: a later change is read back, not the stale env copy
      await Settings.set(key as any, { key, value: "Asia/Ho_Chi_Minh" });
      expect(await Settings.use(key)).to.equal("Asia/Ho_Chi_Minh");
    });

    it("an operator-provided env value wins and stays pinned", async function () {
      process.env[pinnedKey] = "Europe/London";
      const saved = await Settings.set(pinnedKey as any, { key: pinnedKey, value: "Europe/Moscow" });
      expect(Settings.mirrorToEnv(pinnedKey as any, "Europe/Moscow")).to.equal(false);
      expect(process.env[pinnedKey]).to.equal("Europe/London");
      expect(Settings.envOverride(saved).active).to.equal(true);
    });
  });

});
function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
