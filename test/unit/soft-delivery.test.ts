import { expect } from "chai";
import { softDeliveryFallback, softDeliveryMessage } from "../../lib/soft-delivery";
import { applyZone, outsideDeliveryArea } from "../../adapters/delivery/default/zone-calculation";
import { invalidateDeliveryZoneCache } from "../../adapters/delivery/default/zone-cache";
import { DefaultDeliveryAdapter } from "../../adapters/delivery/default/defaultDelivery";

/**
 * An address outside every zone is not a refusal while soft calculation is on.
 *
 * Checkout under `SOFT_DELIVERY_CALCULATION` never throws `code: 11`, so the
 * order goes through whatever the adapter answered. Answering "outside the
 * delivery area" there tells the customer the opposite of what happens next.
 */
describe("Soft delivery calculation", function () {
  // A square around (10, 10), stored the way KML stores rings: [lon, lat].
  const square = [
    [9, 9],
    [11, 9],
    [11, 11],
    [9, 11],
    [9, 9],
  ];
  const zone = { id: "zone-1", polygon: square, deliveryCost: 300, deliveryMessage: "Delivery in 40 minutes", minDeliveryTime: 40 };

  let settings: Record<string, any> = {};
  let asked: string[] = [];
  let originalSettings: any;
  let originalSails: any;
  let originalModel: any;

  beforeEach(function () {
    settings = {};
    asked = [];

    originalSettings = (global as any).Settings;
    originalSails = (global as any).sails;
    originalModel = (global as any).DeliveryZone;
    (global as any).DeliveryZone = { findServing: async () => [zone] };
    invalidateDeliveryZoneCache();

    (global as any).Settings = {
      get: async (key: string) => {
        asked.push(key);
        return settings[key];
      },
    };
    // Translation is identity here; the messages are asserted as written.
    (global as any).sails = { __: (text: string, ...args: string[]) => (args.length ? `${text}:${args.join(",")}` : text) };
  });

  afterEach(function () {
    (global as any).Settings = originalSettings;
    (global as any).sails = originalSails;
    (global as any).DeliveryZone = originalModel;
    invalidateDeliveryZoneCache();
  });

  describe("outside every zone", function () {
    it("hands the address to a manager when no stand-in tariff is configured", async function () {
      settings.SOFT_DELIVERY_CALCULATION = true;
      settings.SOFT_DELIVERY_CALCULATION_MESSAGE = "A manager will call you back";

      const delivery = await outsideDeliveryArea(["outside every zone"]);

      expect(delivery.allowed).to.equal(true);
      expect(delivery.cost).to.equal(null);
      expect(delivery.item).to.equal(undefined);
      expect(delivery.deliveryLocationUnrecognized).to.equal(true);
      expect(delivery.message).to.equal("A manager will call you back");
      expect(delivery.diagnostics).to.deep.equal(["outside every zone"]);
    });

    it("does not call it an error: being outside the area is business logic", async function () {
      settings.SOFT_DELIVERY_CALCULATION = true;

      const delivery = await outsideDeliveryArea();

      // `hasError` means the calculation itself broke — an exception, a dead
      // geocoder. The front-end renders that differently from a notice, and a
      // deliberate business answer must not land in the error state.
      expect(delivery.hasError).to.equal(undefined);
    });

    it("refuses exactly as before when soft calculation is off", async function () {
      settings.SOFT_DELIVERY_CALCULATION = false;

      const delivery = await outsideDeliveryArea(["outside every zone"]);

      expect(delivery.allowed).to.equal(false);
      expect(delivery.cost).to.equal(0);
      expect(delivery.message).to.equal("Outside the delivery area");
      expect(delivery.deliveryLocationUnrecognized).to.equal(undefined);
    });

    it("charges the stand-in cost instead of calling, when one is set", async function () {
      settings.SOFT_DELIVERY_CALCULATION = true;
      settings.OUTSIDE_DELIVERY_AREA_DEFAULT_COST = 500;

      const delivery = await outsideDeliveryArea();

      expect(delivery.allowed).to.equal(true);
      expect(delivery.cost).to.equal(500);
      expect(delivery.deliveryLocationUnrecognized).to.equal(undefined);
      expect(delivery.message).to.equal("Outside the delivery area");
      expect(asked).to.not.include("SOFT_DELIVERY_CALCULATION");
    });

    it("charges the stand-in product instead of calling, when one is set", async function () {
      settings.SOFT_DELIVERY_CALCULATION = true;
      settings.OUTSIDE_DELIVERY_AREA_DEFAULT_ITEM = "delivery-dish-id";

      const delivery = await outsideDeliveryArea();

      expect(delivery.allowed).to.equal(true);
      expect(delivery.item).to.equal("delivery-dish-id");
      expect(delivery.deliveryLocationUnrecognized).to.equal(undefined);
      expect(asked).to.not.include("SOFT_DELIVERY_CALCULATION");
    });
  });

  describe("an address inside a zone", function () {
    it("is priced by the zone and never reaches the soft path", async function () {
      settings.SOFT_DELIVERY_CALCULATION = true;

      const delivery = await applyZone({ id: "zone-1", deliveryCost: 300, deliveryMessage: "Delivery in 40 minutes", minDeliveryTime: 40 } as any, 1000);

      expect(delivery.allowed).to.equal(true);
      expect(delivery.cost).to.equal(300);
      expect(delivery.zoneId).to.equal("zone-1");
      expect(delivery.deliveryLocationUnrecognized).to.equal(undefined);
      expect(asked).to.deep.equal([]);
    });
  });

  describe("the message", function () {
    it("falls back when the operator never set one", async function () {
      settings.SOFT_DELIVERY_CALCULATION = true;

      expect(await softDeliveryMessage()).to.equal("Shipping cost cannot be calculated");
    });

    it("falls back when the setting holds a boolean", async function () {
      // The setting was declared `boolean` for years, so every message an
      // operator typed was coerced to `false` on save. Installs still carry it.
      settings.SOFT_DELIVERY_CALCULATION_MESSAGE = false;

      expect(await softDeliveryMessage()).to.equal("Shipping cost cannot be calculated");
    });
  });

  describe("the setting itself", function () {
    it("returns null when off, so the caller keeps its own refusal", async function () {
      settings.SOFT_DELIVERY_CALCULATION = false;
      expect(await softDeliveryFallback()).to.equal(null);
    });

    it("treats an unset setting as off rather than guessing the default", async function () {
      // `Settings.get` resolves the declared default, so an absent value here
      // means the setting is genuinely absent — do not invent soft behaviour.
      expect(await softDeliveryFallback()).to.equal(null);
    });
  });

  /**
   * The customer meets delivery twice: once typing the address, where GraphQL
   * `checkDeliveryAbility` calls the adapter directly, and once at checkout,
   * where `Order.countCart` calls it and then applies the soft branch. The two
   * are a minute apart, so they have to say the same thing.
   */
  describe("both entry points", function () {
    const adapter = new DefaultDeliveryAdapter();
    const outside = { city: "Demo", street: "Far", home: "1", coordinate: { lat: 50, lon: 50 } } as any;
    const inside = { city: "Demo", street: "Near", home: "1", coordinate: { lat: 10, lon: 10 } } as any;

    it("answers the address form the way checkout will answer", async function () {
      settings.SOFT_DELIVERY_CALCULATION = true;
      settings.SOFT_DELIVERY_CALCULATION_MESSAGE = "A manager will call you back";

      const ability = await adapter.checkAbility(outside);
      expect(ability.allowed).to.equal(true);
      expect(ability.cost).to.equal(null);
      expect(ability.message).to.equal("A manager will call you back");
      expect(ability.hasError).to.equal(undefined);

      // `Order.countCart` re-stamps the same three fields from the same
      // setting, so the calculated result has to arrive already flagged.
      const calculated = await adapter.calculate({ address: outside, basketTotal: 1000 } as any);
      expect(calculated.deliveryLocationUnrecognized).to.equal(true);
      expect(calculated.allowed).to.equal(ability.allowed);
      expect(calculated.cost).to.equal(ability.cost);
      expect(calculated.message).to.equal(await softDeliveryMessage());
    });

    it("still refuses on the address form when soft calculation is off", async function () {
      settings.SOFT_DELIVERY_CALCULATION = false;

      const ability = await adapter.checkAbility(outside);
      expect(ability.allowed).to.equal(false);
      expect(ability.message).to.equal("Outside the delivery area");
    });

    it("leaves an address inside a zone on the zone's terms", async function () {
      settings.SOFT_DELIVERY_CALCULATION = true;

      const ability = await adapter.checkAbility(inside);
      expect(ability.zoneId).to.equal("zone-1");
      expect(ability.deliveryLocationUnrecognized).to.equal(undefined);

      const calculated = await adapter.calculate({ address: inside, basketTotal: 1000 } as any);
      expect(calculated.cost).to.equal(300);
    });
  });
});
