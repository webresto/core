import { expect } from "chai";
import { NotificationTypeRegistry } from "../../libs/NotificationTypeRegistry";

describe("NotificationTypeRegistry.normalize", function () {
  it("parses json-over-text columns that arrive as JSON strings", function () {
    const map = NotificationTypeRegistry.normalize([
      {
        key: "order_accepted_push",
        eventKey: "order_accepted",
        templates: JSON.stringify({ default: { title: "X", body: "Y {{order.shortId}}" }, locales: {}, channels: {} }),
        fixedChannels: JSON.stringify(["sms"]),
        defaultChannels: JSON.stringify(["fcm-web"]),
      },
    ]);
    const type = map["order_accepted_push"];
    expect(type.templates?.default?.body).to.equal("Y {{order.shortId}}");
    expect(type.defaultChannels).to.deep.equal(["fcm-web"]);
    expect(type.fixedChannels).to.deep.equal(["sms"]);
  });

  it("falls back to the seed template when a known type has no usable template", function () {
    const map = NotificationTypeRegistry.normalize([
      { key: "order_on_the_way_push", eventKey: "order_on_the_way", templates: {} },
    ]);
    const type = map["order_on_the_way_push"];
    // Seed (seeds/notification_rules.json) ships a non-empty base template for this key.
    expect(type.templates?.default?.body).to.be.a("string").and.not.empty;
  });

  it("keeps an operator-authored template instead of overwriting with the seed", function () {
    const map = NotificationTypeRegistry.normalize([
      { key: "order_on_the_way_push", eventKey: "order_on_the_way", templates: { default: { body: "custom" } } },
    ]);
    expect(map["order_on_the_way_push"].templates?.default?.body).to.equal("custom");
  });

  it("defaults escalateBy to read and keeps an explicit delivered", function () {
    const map = NotificationTypeRegistry.normalize([
      { key: "order_accepted_push", eventKey: "order_accepted" },
      { key: "order_on_the_way_push", eventKey: "order_on_the_way", escalateBy: "delivered" },
      { key: "user_otp_sms", eventKey: "user_otp", escalateBy: "garbage" },
    ]);
    expect(map["order_accepted_push"].escalateBy).to.equal("read");
    expect(map["order_on_the_way_push"].escalateBy).to.equal("delivered");
    // Unknown values are coerced to the safe default.
    expect(map["user_otp_sms"].escalateBy).to.equal("read");
  });
});

describe("NotificationTypeRegistry.validate", function () {
  it("rejects an invalid escalateBy value", function () {
    const errors = NotificationTypeRegistry.validate({
      key: "order_accepted_push",
      eventKey: "order_accepted",
      escalateBy: "garbage" as any,
    });
    expect(errors.some((e) => e.includes("escalateBy"))).to.equal(true);
  });

  it("accepts read and delivered", function () {
    for (const escalateBy of ["read", "delivered"] as const) {
      const errors = NotificationTypeRegistry.validate({ key: "order_accepted_push", eventKey: "order_accepted", escalateBy });
      expect(errors).to.deep.equal([]);
    }
  });
});
