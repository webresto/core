import { expect } from "chai";
import { resetDatabase } from "../../support/reset";

/**
 * Settings: a key declared by a manifest reads its default until it is written,
 * then the written value, at once and after every rewrite. An environment
 * variable counts only for a key this process has not written: a write fills the
 * cache, and the cache wins.
 */
describe("Settings", function () {
  beforeEach(async function () {
    await resetDatabase();
  });

  it("reads the manifest's default until written, then what was written, rewrite after rewrite", async function () {
    expect(await Settings.get("DELIVERY_CITY_SPEED_KMH")).to.equal(20);

    await Settings.set("DELIVERY_CITY_SPEED_KMH", { value: 30 });
    expect(await Settings.get("DELIVERY_CITY_SPEED_KMH")).to.equal(30);

    await Settings.set("DELIVERY_CITY_SPEED_KMH", { value: 40 });
    expect(await Settings.get("DELIVERY_CITY_SPEED_KMH")).to.equal(40);
  });

  it("keeps a json value whole", async function () {
    const worktime = [{ dayOfWeek: ["monday"], start: "10:00", stop: "11:00" }];
    await Settings.set("WORK_TIME", { value: worktime });
    expect(await Settings.get("WORK_TIME")).to.deep.equal(worktime);
  });

  it("an environment variable does not override a key this process wrote", async function () {
    await Settings.set("DELIVERY_SAFETY_MARGIN_MINUTES", { value: 5 });
    process.env.DELIVERY_SAFETY_MARGIN_MINUTES = "15";
    try {
      expect(await Settings.get("DELIVERY_SAFETY_MARGIN_MINUTES")).to.equal(5);
    } finally {
      delete process.env.DELIVERY_SAFETY_MARGIN_MINUTES;
    }
  });
});
