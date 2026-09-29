import { expect } from "chai";
import { DefaultDeliveryAdapter } from "../../../../adapters/delivery/default/defaultDelivery";
import { resetDatabase, withSettings } from "../../support/reset";

/**
 * Which kitchen cooks an order: the point the customer chose for pickup and
 * dine-in, and for a delivery the first strategy of `KITCHEN_RESOLVE_CHAIN`
 * that names one — the kitchen standing in the address's zone, the nearest
 * open kitchen, the only kitchen there is. A strategy that has no answer, or
 * breaks, hands on to the next; none left means no kitchen.
 *
 *   City 1: Kitchen 1 in Zone 1, Kitchen 2 in Zone 2 to its north.
 *   City 2, far away and with no zones: Kitchen 3.
 */
describe("Kitchen resolver", function () {
  const KITCHEN_1 = { lat: 56.84, lon: 60.61 };
  const KITCHEN_2 = { lat: 56.92, lon: 60.61 };
  const KITCHEN_3 = { lat: 57.153, lon: 65.5343 };
  const ZONE_1 = [[60.5, 56.8], [60.7, 56.8], [60.7, 56.88], [60.5, 56.88], [60.5, 56.8]];
  const ZONE_2 = [[60.5, 56.88], [60.7, 56.88], [60.7, 56.95], [60.5, 56.95], [60.5, 56.88]];

  const k: Record<string, string> = {};

  beforeEach(async function () {
    await resetDatabase();
    const city1 = (await City.create({ name: "City 1" }).fetch()).id;
    const city2 = (await City.create({ name: "City 2" }).fetch()).id;
    const kitchen = async (title: string, city: string, coordinate: unknown) =>
      (await Place.create({ title, city, coordinate, enable: true, isCookingPoint: true, isPickupPoint: true, hasDiningArea: true }).fetch()).id;
    k.kitchen1 = await kitchen("Kitchen 1", city1, KITCHEN_1);
    k.kitchen2 = await kitchen("Kitchen 2", city1, KITCHEN_2);
    k.kitchen3 = await kitchen("Kitchen 3", city2, KITCHEN_3);
    await DeliveryZone.create({ name: "Zone 1", polygon: ZONE_1, deliveryCost: 100, minDeliveryTime: 30 }).fetch();
    await DeliveryZone.create({ name: "Zone 2", polygon: ZONE_2, deliveryCost: 100, minDeliveryTime: 30 }).fetch();
  });

  const resolve = async (request: Record<string, unknown>) => (await Adapter.get("menu")).resolveCookingPlace(request as any);
  const chain = (strategies: string[], run: () => Promise<void>, more: Record<string, unknown> = {}) =>
    withSettings({ KITCHEN_RESOLVE_CHAIN: strategies, ...more }, run);
  const only = async (...keep: string[]) => {
    for (const id of Object.values(k)) if (!keep.includes(id)) await Place.update({ id }, { enable: false }).fetch();
  };

  describe("delivery-zone", function () {
    it("serves the address from the kitchen standing in its zone, nearer by air or not", async function () {
      await chain(["delivery-zone"], async () => {
        // Nearer to Kitchen 1 by air, but inside Zone 2.
        const resolution = await resolve({ coordinate: { lat: 56.881, lon: 60.61 } });

        expect(resolution).to.include({ placeId: k.kitchen2, strategy: "delivery-zone" });
        expect(resolution.diagnostics.join(" ")).to.contain(`delivery-zone: ${k.kitchen2} via zone`);
      });
    });

    it("hands on when the address is in no zone", async function () {
      await chain(["delivery-zone", "nearest-geo"], async () => {
        const resolution = await resolve({ coordinate: { lat: 57.5, lon: 60.61 } });

        expect(resolution.strategy).to.equal("nearest-geo");
        expect(resolution.diagnostics.join(" ")).to.contain("delivery-zone: coordinate is in no zone");
      });
    });

    it("hands on when no open kitchen stands in the zone", async function () {
      await Place.update({ id: k.kitchen2 }, { enable: false }).fetch();
      await chain(["delivery-zone"], async () => {
        const resolution = await resolve({ coordinate: { lat: 56.9, lon: 60.61 } });

        expect(resolution.placeId).to.equal(null);
        expect(resolution.diagnostics.join(" ")).to.match(/delivery-zone: zone \S+ contains no open kitchen/);
      });
    });

    it("hands on when the delivery adapter's zones break", async function () {
      Adapter.register("delivery", "broken-zones", new (class extends DefaultDeliveryAdapter {
        async resolvePlaceForCoordinate(): Promise<any> {
          throw new Error("zones unavailable");
        }
      })());
      await only(k.kitchen1);

      await chain(["delivery-zone", "single-point"], async () => {
        const resolution = await resolve({ coordinate: { lat: 56.85, lon: 60.61 } });

        expect(resolution).to.include({ placeId: k.kitchen1, strategy: "single-point" });
        expect(resolution.diagnostics.join(" ")).to.contain("zones unavailable");
      }, { DELIVERY_ADAPTER: "broken-zones" });
    });
  });

  describe("nearest-geo", function () {
    it("picks the nearest open kitchen; a city is nothing but distance", async function () {
      await chain(["delivery-zone", "nearest-geo"], async () => {
        // City 2 has no zones: its address falls through to the nearest kitchen, its own.
        expect(await resolve({ coordinate: { lat: 57.1551, lon: 65.5319 } })).to.include({ placeId: k.kitchen3, strategy: "nearest-geo" });
        expect((await resolve({ coordinate: { lat: 56.83, lon: 60.6 } })).placeId).to.equal(k.kitchen1);
      }, { DELIVERY_MAX_RADIUS_KM: 0 });
    });

    it("finds nothing past the radius cap", async function () {
      await chain(["nearest-geo"], async () => {
        expect((await resolve({ coordinate: { lat: 55.0, lon: 60.61 } })).placeId).to.equal(null);
      }, { DELIVERY_MAX_RADIUS_KM: 1 });
    });

    it("hands on when no open kitchen has a coordinate", async function () {
      await Place.update({ id: k.kitchen1 }, { enable: false }).fetch();
      await Place.update({ id: k.kitchen3 }, { enable: false }).fetch();
      await Place.update({ id: k.kitchen2 }, { coordinate: null }).fetch();

      await chain(["nearest-geo", "single-point"], async () => {
        expect(await resolve({ coordinate: KITCHEN_1 })).to.include({ placeId: k.kitchen2, strategy: "single-point" });
      });
    });

    it("takes the delivery adapter's road minutes over the straight line", async function () {
      // Farther by air, nearer by road.
      Adapter.register("delivery", "routing-1", new (class extends DefaultDeliveryAdapter {
        async estimateTravel(from: any) {
          return from.lat === KITCHEN_2.lat
            ? { distanceKm: 12, travelMinutes: 15, source: "routing-api" }
            : { distanceKm: 1, travelMinutes: 30, source: "routing-api" };
        }
      })());
      await only(k.kitchen1, k.kitchen2);

      await chain(["nearest-geo"], async () => {
        const resolution = await resolve({ coordinate: { lat: 56.85, lon: 60.61 } });

        expect(resolution.placeId).to.equal(k.kitchen2);
        expect(resolution.diagnostics.join(" ")).to.contain("routing-api");
      }, { DELIVERY_ADAPTER: "routing-1" });
    });

    it("hands on when the road estimate breaks", async function () {
      Adapter.register("delivery", "broken-routing", new (class extends DefaultDeliveryAdapter {
        async estimateTravel(): Promise<any> {
          throw new Error("routing is down");
        }
      })());
      await only(k.kitchen2);

      await chain(["nearest-geo", "single-point"], async () => {
        const resolution = await resolve({ coordinate: { lat: 56.85, lon: 60.61 } });

        expect(resolution).to.include({ placeId: k.kitchen2, strategy: "single-point" });
        expect(resolution.diagnostics.join(" ")).to.contain("routing is down");
      }, { DELIVERY_ADAPTER: "broken-routing" });
    });
  });

  describe("single-point", function () {
    it("names the only enabled kitchen, and nothing when there are more", async function () {
      await chain(["single-point"], async () => {
        const several = await resolve({});
        expect(several.placeId).to.equal(null);
        expect(several.diagnostics.join(" ")).to.contain("3 enabled kitchens");

        await only(k.kitchen1);
        expect((await resolve({})).placeId).to.equal(k.kitchen1);
      });
    });
  });

  describe("the chain", function () {
    it("names no kitchen when it is empty", async function () {
      await chain([], async () => {
        const resolution = await resolve({});

        expect(resolution.placeId).to.equal(null);
        expect(resolution.diagnostics.join(" ")).to.contain("KITCHEN_RESOLVE_CHAIN is empty");
      });
    });

    it("cannot be set to a strategy core does not know, or to one strategy twice", async function () {
      const before = await Settings.get("KITCHEN_RESOLVE_CHAIN");
      for (const value of [["nearest-geo", "strategy-9"], ["nearest-geo", "nearest-geo"]]) {
        await Settings.set("KITCHEN_RESOLVE_CHAIN", { value } as any);
        expect(await Settings.get("KITCHEN_RESOLVE_CHAIN")).to.deep.equal(before);
      }
    });
  });

  describe("pickup and dine-in", function () {
    it("are cooked at the point the customer chose, whatever the chain, an empty one included", async function () {
      await chain([], async () => {
        for (const serviceType of ["pickup", "dine-in"]) {
          expect(await resolve({ serviceType, pickupPointId: k.kitchen2 })).to.include({ placeId: k.kitchen2, strategy: "pickup-point" });
        }
      });
    });

    it("have no kitchen at a point that does not cook", async function () {
      const point1 = (await Place.create({ title: "Point 1", enable: true, isCookingPoint: false, isPickupPoint: true }).fetch()).id;

      const resolution = await resolve({ serviceType: "pickup", pickupPointId: point1 });

      expect(resolution.placeId).to.equal(null);
      expect(resolution.diagnostics.join(" ")).to.contain("not an enabled cooking point");
    });
  });
});
