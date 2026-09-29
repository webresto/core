import { expect } from "chai";
import sinon from "sinon";
import DeliveryAdapter from "../../../../adapters/delivery/DeliveryAdapter";
import { estimateDeliveryTime } from "../../../../lib/order/order-timing";
import { resetDatabase } from "../../support/reset";

/**
 * The time a delivery promises: the slowest cooked line, the road from the
 * kitchen to the customer at the installation's city speed, the zone's floor
 * for the road, and the installation's safety margin on top.
 */
describe("Delivery estimate", function () {
  const KITCHEN_1 = { lat: 56.8371, lon: 60.6019 };
  /** About six kilometres north of Kitchen 1. */
  const CUSTOMER_1 = { lat: 56.8907, lon: 60.6103 };
  const PRODUCTS = [
    { id: "dish-1", type: "dish", cookingTimeMax: 20 },
    // Not cooked: its time does not count.
    { id: "product-1", type: "product", cookingTimeMax: 90 },
  ];

  let delivery: DeliveryAdapter;

  before(async function () {
    await resetDatabase();
    delivery = await Adapter.get("delivery");
  });

  afterEach(async function () {
    sinon.restore();
    await Settings.set("DELIVERY_CITY_SPEED_KMH", { value: 20 });
    await Settings.set("DELIVERY_SAFETY_MARGIN_MINUTES", { value: 0 });
  });

  describe("the road", function () {
    it("is a straight line at the installation's city speed", async function () {
      await Settings.set("DELIVERY_CITY_SPEED_KMH", { value: 60 });

      const travel = await delivery.estimateTravel(KITCHEN_1, CUSTOMER_1);

      expect(travel?.source).to.equal("haversine");
      expect(travel!.distanceKm).to.be.greaterThan(5).and.lessThan(7);
      expect(travel!.travelMinutes).to.equal(Math.ceil(travel!.distanceKm));
    });

    it("is unknown when either end has no coordinate", async function () {
      expect(await delivery.estimateTravel(null, CUSTOMER_1)).to.equal(null);
      expect(await delivery.estimateTravel(KITCHEN_1, null)).to.equal(null);
    });

    it("is whatever an adapter with its own routing answers", async function () {
      class RoutedDelivery extends DeliveryAdapter {
        async calculate() { return {} as any; }
        async checkAbility() { return {} as any; }
        async estimateTravel() { return { distanceKm: 4.2, travelMinutes: 9, source: "routing-api" }; }
      }

      const estimate = await estimateDeliveryTime({ products: PRODUCTS, kitchen: KITCHEN_1, customer: CUSTOMER_1 }, new RoutedDelivery());

      expect(estimate).to.include({ travelSource: "routing-api", travelMinutes: 9 });
    });
  });

  describe("the whole promise", function () {
    it("is cooking plus road plus margin, counting only cooked lines", async function () {
      await Settings.set("DELIVERY_CITY_SPEED_KMH", { value: 60 });
      await Settings.set("DELIVERY_SAFETY_MARGIN_MINUTES", { value: 5 });

      const estimate = await estimateDeliveryTime({ products: PRODUCTS, kitchen: KITCHEN_1, customer: CUSTOMER_1 }, delivery);

      expect(estimate.preparationMinutes).to.equal(20);
      expect(estimate.totalMinutes).to.equal(20 + estimate.travelMinutes + 5);
    });

    it("holds the road at the zone's floor", async function () {
      await Settings.set("DELIVERY_SAFETY_MARGIN_MINUTES", { value: 5 });

      const estimate = await estimateDeliveryTime({
        products: PRODUCTS, kitchen: KITCHEN_1, customer: CUSTOMER_1, minDeliveryMinutes: 45,
      }, delivery);

      expect(estimate.totalMinutes).to.equal(20 + 45 + 5);
    });

    it("has no floor but the zone's: without one, the road alone", async function () {
      const asked = sinon.spy(Settings, "get");

      const estimate = await estimateDeliveryTime({ products: PRODUCTS, kitchen: KITCHEN_1, customer: CUSTOMER_1 }, delivery);

      expect(estimate.travelMinutes).to.be.greaterThan(0);
      expect(estimate.totalMinutes).to.equal(20 + estimate.travelMinutes);
      // No installation-wide floor is read: the speed and the margin, nothing else.
      expect(asked.args.map(([key]) => key)).to.deep.equal(["DELIVERY_CITY_SPEED_KMH", "DELIVERY_SAFETY_MARGIN_MINUTES"]);
    });

    it("still answers without coordinates: cooking and margin", async function () {
      await Settings.set("DELIVERY_SAFETY_MARGIN_MINUTES", { value: 3 });

      const estimate = await estimateDeliveryTime({ products: PRODUCTS, kitchen: null, customer: null }, delivery);

      expect(estimate.travelSource).to.equal("none");
      expect(estimate.totalMinutes).to.equal(23);
    });
  });
});
