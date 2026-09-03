import { expect } from "chai";
import DeliveryAdapter from "../../adapters/delivery/DeliveryAdapter";
import { estimateDeliveryTime, fitsMaxWait, resolveOrderTiming } from "../../lib/order-timing";


describe("order-timing", function () {
  const realSettings = (global as any).Settings;
  const realSails = (global as any).sails;

  const center = { lat: 56.8371, lng: 60.6019 };
  const north = { lat: 56.8907, lng: 60.6103 };
  const dishes = [
    { id: "a", type: "dish", cookingTimeMax: 20 },
    { id: "b", type: "product", cookingTimeMax: 90 },
  ];

  function bindSettings(values: Record<string, any>) {
    (global as any).Settings = { async get(key: string) { return values[key]; } };
    (global as any).sails = { log: { warn: () => undefined, error: () => undefined, info: () => undefined, silly: () => undefined } };
  }

  afterEach(function () {
    (global as any).Settings = realSettings;
    (global as any).sails = realSails;
  });

  /** The built-in adapter's own travel estimate, with nothing else stubbed. */
  class StraightLineDelivery extends DeliveryAdapter {
    async calculate() { return {} as any; }
    async checkAbility() { return {} as any; }
  }
  const adapter = new StraightLineDelivery();

  describe("timing modes", function () {
    it("defaults to ASAP with no ceiling", function () {
      expect(resolveOrderTiming({}).mode).to.equal("asap");
      expect(resolveOrderTiming({}).code).to.equal(undefined);
    });

    it("tells the two modes apart", function () {
      expect(resolveOrderTiming({ date: "2026-09-01 12:00:00" }).mode).to.equal("scheduled");
      expect(resolveOrderTiming({ maxWaitMinutes: 60 }).mode).to.equal("asap");
      expect(resolveOrderTiming({ date: "   " }).mode).to.equal("asap");
    });

    it("refuses an order that is in both modes", function () {
      expect(resolveOrderTiming({ date: "2026-09-01 12:00:00", maxWaitMinutes: 60 }).code)
        .to.equal("ORDER_TIMING_AMBIGUOUS");
    });

    it("refuses a wait that is not a positive number of minutes", function () {
      expect(resolveOrderTiming({ maxWaitMinutes: 0 }).code).to.equal("ORDER_WAIT_TOO_SHORT");
      expect(resolveOrderTiming({ maxWaitMinutes: -5 }).code).to.equal("ORDER_WAIT_TOO_SHORT");
      // Garbage reads as "no ceiling", not as a refusal.
      expect(resolveOrderTiming({ maxWaitMinutes: NaN }).code).to.equal(undefined);
    });
  });

  describe("max wait", function () {
    it("compares the promise against the stated ceiling", function () {
      expect(fitsMaxWait({ totalMinutes: 60 }, 60)).to.equal(true);
      expect(fitsMaxWait({ totalMinutes: 61 }, 60)).to.equal(false);
      expect(fitsMaxWait({ totalMinutes: 999 }, null)).to.equal(true);
    });
  });

  describe("travel", function () {
    it("estimates a straight line at the configured city speed", async function () {
      bindSettings({});
      const travel = await adapter.estimateTravel(center, north);
      expect(travel?.source).to.equal("haversine");
      expect(travel!.distanceKm).to.be.greaterThan(5).and.lessThan(7);
    });

    it("returns nothing when a coordinate is missing", async function () {
      bindSettings({});
      expect(await adapter.estimateTravel(null, north)).to.equal(null);
      expect(await adapter.estimateTravel(center, null)).to.equal(null);
    });

    it("lets an adapter answer with its own routing", async function () {
      // The seam that replaced the provider registry: an adapter with a routing
      // API overrides the method, and everything downstream reads its answer.
      class RoutedDelivery extends StraightLineDelivery {
        async estimateTravel() {
          return { distanceKm: 4.2, travelMinutes: 9, source: "routing-api" };
        }
      }

      bindSettings({ DELIVERY_SAFETY_MARGIN_MINUTES: 0 });
      const estimate = await estimateDeliveryTime(
        { products: dishes, kitchen: center, customer: north },
        new RoutedDelivery(),
      );

      expect(estimate.travelSource).to.equal("routing-api");
      expect(estimate.travelMinutes).to.equal(9);
    });
  });

  describe("the whole promise", function () {
    it("counts only cooked products and adds the margin", async function () {
      bindSettings({ DELIVERY_CITY_SPEED_KMH: 60, DELIVERY_SAFETY_MARGIN_MINUTES: 5 });
      const estimate = await estimateDeliveryTime({ products: dishes, kitchen: center, customer: north }, adapter);
      expect(estimate.preparationMinutes).to.equal(20);
      expect(estimate.totalMinutes).to.equal(20 + estimate.travelMinutes + 5);
    });

    it("holds the delivery leg at the floor the adapter reported", async function () {
      bindSettings({ DELIVERY_CITY_SPEED_KMH: 60, DELIVERY_SAFETY_MARGIN_MINUTES: 5 });
      const estimate = await estimateDeliveryTime({
        products: dishes, kitchen: center, customer: north, minDeliveryMinutes: 45,
      }, adapter);
      expect(estimate.totalMinutes).to.equal(20 + 45 + 5);
    });

    it("keeps the installation floor when there is no zone", async function () {
      bindSettings({ DELIVERY_CITY_SPEED_KMH: 60, MIN_DELIVERY_TIME_IN_MINUTES: 40 });
      const estimate = await estimateDeliveryTime({ products: dishes, kitchen: center, customer: north }, adapter);
      expect(estimate.totalMinutes).to.equal(20 + 40);
    });

    it("still answers without coordinates", async function () {
      bindSettings({ DELIVERY_SAFETY_MARGIN_MINUTES: 3 });
      const estimate = await estimateDeliveryTime({ products: dishes, kitchen: null, customer: null }, adapter);
      expect(estimate.travelSource).to.equal("none");
      expect(estimate.totalMinutes).to.equal(23);
    });
  });
});
