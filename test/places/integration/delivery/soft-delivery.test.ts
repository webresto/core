import { expect } from "chai";
import sinon from "sinon";
import { softDeliveryFallback, softDeliveryMessage } from "../../../../lib/delivery/soft-delivery";
import { locationUnrecognized, outsideDeliveryArea } from "../../../../adapters/delivery/default/zone-calculation";
import { nominatim } from "../../support/nominatim";
import { resetDatabase, withSettings } from "../../support/reset";

/**
 * Soft delivery calculation (`SOFT_DELIVERY_CALCULATION`, on out of the box):
 * an address outside every zone, or one the map cannot place, is not refused
 * but handed to an operator to price. Checkout under it takes the order either
 * way, so the address form has to answer the same. A stand-in tariff for
 * addresses outside the zones prices them instead. An installation with no
 * zones at all delivers nothing, soft or not.
 *
 *   Zone 1, delivery 300.
 */
describe("Soft delivery calculation", function () {
  const ZONE_1 = [[9, 9], [11, 9], [11, 11], [9, 11], [9, 9]];
  const INSIDE = { city: "City 1", formatted: "Street 1", home: "1", coordinate: { lat: 10, lon: 10 } } as any;
  const OUTSIDE = { city: "City 1", formatted: "Street 2", home: "1", coordinate: { lat: 50, lon: 50 } } as any;
  /** A street and a house the catalog has no point for: the adapter asks Nominatim. */
  const TYPED = { city: "City 1", formatted: "Street 3", home: "9" } as any;
  const SOFT = { SOFT_DELIVERY_CALCULATION: true, SOFT_DELIVERY_CALCULATION_MESSAGE: "Message 1" };
  const HARD = { SOFT_DELIVERY_CALCULATION: false };

  let delivery: any;

  before(async function () {
    await resetDatabase();
    await DeliveryZone.create({ name: "Zone 1", polygon: ZONE_1, deliveryCost: 300, minDeliveryTime: 40, deliveryMessage: "Message 2" }).fetch();
    delivery = await Adapter.get("delivery");
  });

  afterEach(function () {
    sinon.restore();
    nominatim.reply = undefined;
  });

  const nominatimDown = () => {
    nominatim.reply = () => {
      throw new Error("down");
    };
  };

  describe("outside every zone", function () {
    it("soft: allowed, no price, the operator's message, and not an error", async function () {
      await withSettings(SOFT, async () => {
        const answer = await outsideDeliveryArea(["outside every zone"]);

        expect(answer).to.include({ allowed: true, cost: null, item: undefined, deliveryLocationUnrecognized: true, message: "Message 1" });
        // `hasError` is for a calculation that broke; this is a business answer.
        expect(answer.hasError).to.equal(undefined);
        expect(answer.diagnostics).to.deep.equal(["outside every zone"]);
      });
    });

    it("off: refused", async function () {
      await withSettings(HARD, async () => {
        const answer = await outsideDeliveryArea();
        expect(answer).to.include({ allowed: false, cost: 0, message: "Outside the delivery area" });
        expect(answer.deliveryLocationUnrecognized).to.equal(undefined);
      });
    });

    it("a stand-in cost or product prices it instead, without asking about soft calculation", async function () {
      const asked = sinon.spy(Settings, "get");

      await withSettings({ ...SOFT, OUTSIDE_DELIVERY_AREA_DEFAULT_COST: 500 }, async () => {
        asked.resetHistory();
        expect(await outsideDeliveryArea()).to.include({ allowed: true, cost: 500, message: "Outside the delivery area" });
        expect(asked.args.map(([key]) => key)).to.not.include("SOFT_DELIVERY_CALCULATION");
      });

      await withSettings({ ...SOFT, OUTSIDE_DELIVERY_AREA_DEFAULT_ITEM: "dish-1" }, async () => {
        asked.resetHistory();
        const answer = await outsideDeliveryArea();
        expect(answer).to.include({ allowed: true, item: "dish-1" });
        expect(answer.deliveryLocationUnrecognized).to.equal(undefined);
        expect(asked.args.map(([key]) => key)).to.not.include("SOFT_DELIVERY_CALCULATION");
      });
    });
  });

  describe("an address the map could not place", function () {
    it("soft: handed to the operator like one outside the zones", async function () {
      await withSettings(SOFT, async () => {
        const answer = await locationUnrecognized(["DELIVERY_LOCATION_GEOCODER_FAILED"]);

        expect(answer).to.include({ allowed: true, cost: null, message: "Message 1", deliveryLocationUnrecognized: true });
        expect(answer.hasError).to.equal(undefined);
      });
    });

    it("off: refused", async function () {
      await withSettings(HARD, async () => {
        expect(await locationUnrecognized([])).to.include({ allowed: false, cost: 0, message: "Coordinates not found" });
      });
    });
  });

  describe("the message and the switch", function () {
    it("falls back to core's own message when the operator set none", async function () {
      await withSettings({ SOFT_DELIVERY_CALCULATION_MESSAGE: "" }, async () => {
        expect(await softDeliveryMessage()).to.equal("Shipping cost cannot be calculated");
      });
    });

    it("off gives no fallback, so the caller keeps its own refusal", async function () {
      await withSettings(HARD, async () => {
        expect(await softDeliveryFallback()).to.equal(null);
      });
    });
  });

  /**
   * The customer meets delivery twice: typing the address (`checkAbility`,
   * what GraphQL's `checkDeliveryAbility` calls) and at checkout (`calculate`,
   * what `Order.countCart` calls). A minute apart, they have to agree.
   */
  describe("the address form and checkout agree", function () {
    it("outside every zone, soft", async function () {
      await withSettings(SOFT, async () => {
        const ability = await delivery.checkAbility(OUTSIDE);
        const calculated = await delivery.calculate({ address: OUTSIDE, basketTotal: 1000 });

        expect(ability).to.include({ allowed: true, cost: null, message: "Message 1" });
        expect(ability.hasError).to.equal(undefined);
        expect(calculated).to.include({ allowed: true, cost: null, message: "Message 1", deliveryLocationUnrecognized: true });
      });
    });

    it("outside every zone, off: refused on the form", async function () {
      await withSettings(HARD, async () => {
        expect(await delivery.checkAbility(OUTSIDE)).to.include({ allowed: false, message: "Outside the delivery area" });
      });
    });

    it("inside a zone: the zone's terms on both, the soft path never reached", async function () {
      await withSettings(SOFT, async () => {
        const ability = await delivery.checkAbility(INSIDE);
        expect(ability).to.include({ allowed: true, cost: 300, zoneName: "Zone 1" });
        expect(ability.deliveryLocationUnrecognized).to.equal(undefined);
        expect((await delivery.calculate({ address: INSIDE, basketTotal: 1000 })).cost).to.equal(300);
      });
    });

    it("Nominatim down, soft: handed to the operator on both", async function () {
      nominatimDown();
      await withSettings(SOFT, async () => {
        const ability = await delivery.checkAbility(TYPED);
        const calculated = await delivery.calculate({ address: TYPED, basketTotal: 1000 });

        expect(ability).to.include({ allowed: true, cost: null, message: "Message 1" });
        expect(ability.hasError).to.equal(undefined);
        expect(calculated).to.include({ allowed: ability.allowed, cost: ability.cost, message: ability.message });
      });
    });

    it("Nominatim down, off: refused on the form", async function () {
      nominatimDown();
      await withSettings(HARD, async () => {
        expect(await delivery.checkAbility(TYPED)).to.include({ allowed: false, message: "Coordinates not found" });
      });
    });

    it("an address with nothing to place it by: refused on the form when off", async function () {
      await withSettings(HARD, async () => {
        expect(await delivery.checkAbility({ city: "City 1", formatted: "Somewhere" })).to.include({ allowed: false, message: "Coordinates not found" });
      });
    });
  });

  describe("an installation with no zones", function () {
    before(async function () {
      await DeliveryZone.destroy({}).fetch();
    });

    it("delivers nothing, soft or not, on both, and says it is not configured", async function () {
      await withSettings(SOFT, async () => {
        for (const answer of [await delivery.checkAbility(INSIDE), await delivery.calculate({ address: INSIDE, basketTotal: 1000 })]) {
          expect(answer).to.include({ allowed: false, cost: 0, message: "Delivery is not available", notConfigured: true });
          expect(answer.diagnostics).to.include("no delivery zones configured");
          expect(answer.hasError).to.equal(undefined);
        }
      });
      // Only the installation without zones is "not configured".
      expect((await outsideDeliveryArea()).notConfigured).to.equal(undefined);
    });
  });
});
