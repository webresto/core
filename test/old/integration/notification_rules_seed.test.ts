import { expect } from "chai";

/**
 * NotificationRules.seedDefaults is idempotent by `key` (review2 §1.1): an installation whose
 * catalog was seeded by an older core still receives the rules a newer one ships — without its
 * own rows being touched. The old "seed only when the catalog is empty" meant `user_otp_sms`,
 * the only way a login code goes out, never appeared on an upgrade.
 */
describe("NotificationRules.seedDefaults", function () {
  this.timeout(20000);

  const seed = require("../../seeds/notification_rules.json") as Array<{ key: string; enabled: boolean }>;
  const otp = seed.find((rule) => rule.key === "user_otp_sms")!;

  it("ships the OTP rule enabled — sign-in has no other way out", function () {
    expect(otp.enabled).to.equal(true);
  });

  it("adds the rules the catalog lacks and leaves the ones it has alone", async function () {
    await NotificationRules.seedDefaults();
    const original = await NotificationRules.findOne({ key: "order_on_the_way_push" });

    // An operator-edited row and a rule that "arrived with the upgrade".
    await NotificationRules.updateOne({ key: "order_on_the_way_push" }, { name: "operator's own", enabled: false });
    await NotificationRules.destroy({ key: "user_otp_sms" });

    await NotificationRules.seedDefaults();
    await NotificationRules.seedDefaults();

    try {
      const restored = await NotificationRules.find({ key: "user_otp_sms" });
      expect(restored, "the missing rule is created exactly once").to.have.lengthOf(1);
      expect(restored[0].enabled).to.equal(true);

      const kept = await NotificationRules.findOne({ key: "order_on_the_way_push" });
      expect(kept.name).to.equal("operator's own");
      expect(kept.enabled).to.equal(false);

      for (const rule of seed) {
        expect(await NotificationRules.count({ key: rule.key }), rule.key).to.equal(1);
      }
    } finally {
      await NotificationRules.updateOne({ key: "order_on_the_way_push" }, { name: original.name, enabled: original.enabled });
    }
  });
});
