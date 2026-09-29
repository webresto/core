import { expect } from "chai";
import { NotificationTypeRegistry } from "../../../../lib/notifications/NotificationTypeRegistry";

/**
 * Notification types as they come out of the database: the JSON the columns
 * hold is read back, a known type without a template gets the shipped one, and
 * an unknown escalation mode falls back to the safe one.
 */
describe("Notification type registry", function () {
  describe("normalize", function () {
    it("reads columns that arrive as JSON strings", function () {
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

    it("gives a known type with no usable template the shipped one, and keeps an operator's own", function () {
      const shipped = NotificationTypeRegistry.normalize([{ key: "order_on_the_way_push", eventKey: "order_on_the_way", templates: {} }]);
      expect(shipped["order_on_the_way_push"].templates?.default?.body).to.be.a("string").and.not.empty;

      const own = NotificationTypeRegistry.normalize([
        { key: "order_on_the_way_push", eventKey: "order_on_the_way", templates: { default: { body: "custom" } } },
      ]);
      expect(own["order_on_the_way_push"].templates?.default?.body).to.equal("custom");
    });

    it("escalates on read by default, keeps delivered, and reads anything else as read", function () {
      const map = NotificationTypeRegistry.normalize([
        { key: "order_accepted_push", eventKey: "order_accepted" },
        { key: "order_on_the_way_push", eventKey: "order_on_the_way", escalateBy: "delivered" },
        { key: "user_otp_sms", eventKey: "user_otp", escalateBy: "garbage" },
      ]);
      expect(map["order_accepted_push"].escalateBy).to.equal("read");
      expect(map["order_on_the_way_push"].escalateBy).to.equal("delivered");
      expect(map["user_otp_sms"].escalateBy).to.equal("read");
    });
  });

  describe("validate", function () {
    it("accepts read and delivered and refuses anything else", function () {
      for (const escalateBy of ["read", "delivered"] as const) {
        expect(NotificationTypeRegistry.validate({ key: "order_accepted_push", eventKey: "order_accepted", escalateBy })).to.deep.equal([]);
      }
      const errors = NotificationTypeRegistry.validate({ key: "order_accepted_push", eventKey: "order_accepted", escalateBy: "garbage" as any });
      expect(errors.some((error) => error.includes("escalateBy"))).to.equal(true);
    });
  });
});
