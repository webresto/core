import { expect } from "chai";
import { getOrderCookingPlaceId, placeAcceptsOrdersNow } from "../../lib/cooking-place";
import { getKitchenResolveChain, resolveCookingPlace } from "../../lib/kitchen-resolver";
import { distanceKm } from "../../adapters/delivery/geo";
import DeliveryAdapter from "../../adapters/delivery/DeliveryAdapter";
import { invalidateDeliveryZoneCache } from "../../adapters/delivery/default/zone-cache";

describe("kitchen-resolver", function () {
  const realSettings = (global as any).Settings;
  const realPlace = (global as any).Place;
  const realDeliveryZone = (global as any).DeliveryZone;
  const realAdapter = (global as any).Adapter;
  const realSails = (global as any).sails;

  const warnings: string[] = [];

  /** The built-in adapter's own travel estimate, with nothing overridden. */
  class StraightLineDelivery extends DeliveryAdapter {
    async calculate() { return {} as any; }
    async checkAbility() { return {} as any; }
  }

  function bindGlobals(
    settings: Record<string, any>,
    places: Array<Record<string, any>>,
    delivery: DeliveryAdapter = new StraightLineDelivery(),
    zones: Array<Record<string, any>> = [],
  ) {
    warnings.length = 0;
    invalidateDeliveryZoneCache();
    (global as any).DeliveryZone = {
      async findServing() {
        return zones;
      },
    };
    (global as any).Settings = {
      async get(key: string) {
        return settings[key];
      },
    };
    (global as any).Place = {
      async find() {
        return places;
      },
      async findOne(criteria: { id: string }) {
        return places.find((place) => place.id === criteria.id) ?? undefined;
      },
    };
    (global as any).Adapter = {
      async getRMSAdapter() { return null; },
      async getDeliveryAdapter() { return delivery; },
    };
    (global as any).sails = {
      log: {
        warn: (message: string) => warnings.push(String(message)),
        error: () => undefined,
        silly: () => undefined,
      },
    };
  }

  afterEach(function () {
    (global as any).Settings = realSettings;
    (global as any).Place = realPlace;
    (global as any).DeliveryZone = realDeliveryZone;
    invalidateDeliveryZoneCache();
    (global as any).Adapter = realAdapter;
    (global as any).sails = realSails;
  });

  const TODAY = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"][new Date().getDay()];
  const center = { id: "center", isCookingPoint: true, enable: true, coordinate: { lat: 56.84, lng: 60.61 } };
  const north = { id: "north", isCookingPoint: true, enable: true, coordinate: { lat: 56.92, lng: 60.61 } };

  it("assigns no kitchen when the chain is empty", async function () {
    bindGlobals({ KITCHEN_RESOLVE_CHAIN: [] }, [center]);

    const resolution = await resolveCookingPlace({});

    expect(resolution.placeId).to.equal(null);
    expect(resolution.diagnostics.join(" ")).to.contain("KITCHEN_RESOLVE_CHAIN is empty");
  });

  it("hands on to the next strategy when nearest-geo has no candidate", async function () {
    // An absence, never a refusal: the closed kitchen and the one without a
    // coordinate leave nearest-geo nothing to pick, and the chain must continue
    // rather than leave the order without a kitchen.
    bindGlobals(
      { KITCHEN_RESOLVE_CHAIN: ["nearest-geo", "single-point"], DEFAULT_COOKING_PLACE: "north" },
      [{ ...center, enable: false }, { ...north, coordinate: null }],
    );

    const resolution = await resolveCookingPlace({ coordinate: { lat: 56.84, lng: 60.61 } });

    expect(resolution.placeId).to.equal("north");
    expect(resolution.strategy).to.equal("single-point");
  });

  it("picks the nearest open kitchen inside the radius", async function () {
    bindGlobals({ KITCHEN_RESOLVE_CHAIN: ["nearest-geo"], DELIVERY_MAX_RADIUS_KM: 0 }, [center, north]);

    const resolution = await resolveCookingPlace({ coordinate: { lat: 56.85, lng: 60.61 } });

    expect(resolution.placeId).to.equal("center");
  });

  it("passes when every kitchen is outside the radius", async function () {
    bindGlobals({ KITCHEN_RESOLVE_CHAIN: ["nearest-geo"], DELIVERY_MAX_RADIUS_KM: 1 }, [center, north]);

    const resolution = await resolveCookingPlace({ coordinate: { lat: 55.0, lng: 60.61 } });

    expect(resolution.placeId).to.equal(null);
  });

  // Zones are rings of [lon, lat]; each square holds exactly one demo kitchen.
  const centerZone = { id: "zone-center", polygon: [[60.5, 56.8], [60.7, 56.8], [60.7, 56.88], [60.5, 56.88], [60.5, 56.8]] };
  const northZone = { id: "zone-north", polygon: [[60.5, 56.88], [60.7, 56.88], [60.7, 56.95], [60.5, 56.95], [60.5, 56.88]] };

  it("serves the customer from the kitchen inside their zone", async function () {
    bindGlobals({ KITCHEN_RESOLVE_CHAIN: ["delivery-zone"] }, [center, north], undefined, [centerZone, northZone]);

    // Nearer to center by air, but inside the north zone.
    const resolution = await resolveCookingPlace({ coordinate: { lat: 56.881, lng: 60.61 } });

    expect(resolution.placeId).to.equal("north");
    expect(resolution.strategy).to.equal("delivery-zone");
    expect(resolution.diagnostics.join(" ")).to.contain("delivery-zone: north via zone zone-north");
  });

  it("passes when the coordinate is in no zone", async function () {
    bindGlobals(
      { KITCHEN_RESOLVE_CHAIN: ["delivery-zone", "nearest-geo"] },
      [center, north],
      undefined,
      [centerZone, northZone],
    );

    const resolution = await resolveCookingPlace({ coordinate: { lat: 57.5, lng: 60.61 } });

    expect(resolution.strategy).to.equal("nearest-geo");
    expect(resolution.diagnostics.join(" ")).to.contain("delivery-zone: coordinate is in no zone");
  });

  it("passes when the zone holds no open kitchen", async function () {
    bindGlobals(
      { KITCHEN_RESOLVE_CHAIN: ["delivery-zone"] },
      [center, { ...north, enable: false }],
      undefined,
      [centerZone, northZone],
    );

    const resolution = await resolveCookingPlace({ coordinate: { lat: 56.9, lng: 60.61 } });

    expect(resolution.placeId).to.equal(null);
    expect(resolution.diagnostics.join(" ")).to.contain("delivery-zone: zone zone-north contains no open kitchen");
  });

  it("passes to the next strategy when the zone adapter throws", async function () {
    class BrokenZones extends StraightLineDelivery {
      async resolvePlaceForCoordinate(): Promise<any> { throw new Error("zones unavailable"); }
    }
    bindGlobals(
      { KITCHEN_RESOLVE_CHAIN: ["delivery-zone", "single-point"], DEFAULT_COOKING_PLACE: "center" },
      [center, north],
      new BrokenZones(),
    );

    const resolution = await resolveCookingPlace({ coordinate: { lat: 56.85, lng: 60.61 } });

    expect(resolution.placeId).to.equal("center");
    expect(resolution.strategy).to.equal("single-point");
    expect(resolution.diagnostics.join(" ")).to.contain("zones unavailable");
  });

  it("lets a routing adapter's minutes outrank the straight line", async function () {
    // The far kitchen by air is the near one by road: the adapter's estimate
    // is the answer, not a hint.
    class RoutingDelivery extends StraightLineDelivery {
      async estimateTravel(from: any) {
        return from.lat === north.coordinate.lat
          ? { distanceKm: 12, travelMinutes: 15, source: "routing-api" }
          : { distanceKm: 1, travelMinutes: 30, source: "routing-api" };
      }
    }
    bindGlobals({ KITCHEN_RESOLVE_CHAIN: ["nearest-geo"] }, [center, north], new RoutingDelivery());

    const resolution = await resolveCookingPlace({ coordinate: { lat: 56.85, lng: 60.61 } });

    expect(resolution.placeId).to.equal("north");
    expect(resolution.diagnostics.join(" ")).to.contain("routing-api");
  });

  it("passes to the next strategy when the delivery adapter throws", async function () {
    class BrokenDelivery extends StraightLineDelivery {
      async estimateTravel(): Promise<any> { throw new Error("routing is down"); }
    }
    bindGlobals(
      { KITCHEN_RESOLVE_CHAIN: ["nearest-geo", "single-point"], DEFAULT_COOKING_PLACE: "north" },
      [center, north],
      new BrokenDelivery(),
    );

    const resolution = await resolveCookingPlace({ coordinate: { lat: 56.85, lng: 60.61 } });

    expect(resolution.placeId).to.equal("north");
    expect(resolution.strategy).to.equal("single-point");
    expect(resolution.diagnostics.join(" ")).to.contain("routing is down");
  });

  it("serves a pickup order from the point the customer chose", async function () {
    bindGlobals({ KITCHEN_RESOLVE_CHAIN: ["nearest-geo"] }, [center, north]);

    const resolution = await resolveCookingPlace({ selfService: true, pickupPointId: "north" });

    expect(resolution.placeId).to.equal("north");
    expect(resolution.strategy).to.equal("pickup-point");
  });

  it("drops unknown names and repeats from the chain", async function () {
    bindGlobals({ KITCHEN_RESOLVE_CHAIN: ["single-point", "moon-base", "single-point"] }, [center]);

    expect(await getKitchenResolveChain()).to.deep.equal(["single-point"]);
    expect(warnings.join(" ")).to.contain("moon-base");
  });

  it("reads the order's own kitchen before the installation default", async function () {
    bindGlobals({ DEFAULT_COOKING_PLACE: "north" }, [center, north]);

    expect(await getOrderCookingPlaceId({ cookingPoint: "center" })).to.equal("center");
    expect(await getOrderCookingPlaceId({ cookingPoint: null })).to.equal("north");
  });

  it("treats a point without a schedule as always open", function () {
    expect(placeAcceptsOrdersNow(center)).to.equal(true);
    expect(placeAcceptsOrdersNow({ ...center, enable: false })).to.equal(false);
  });

  it("treats a point whose schedule does not cover now as closed", function () {
    const closed = { ...center, worktime: [{ dayOfWeek: [TODAY], start: "00:00", stop: "00:01" }] };
    expect(placeAcceptsOrdersNow(closed)).to.equal(false);
  });

  it("measures distance in kilometres", function () {
    expect(distanceKm({ lat: 56.84, lng: 60.61 }, { lat: 56.84, lng: 60.61 })).to.equal(0);
    expect(distanceKm({ lat: 56.84, lng: 60.61 }, { lat: 56.92, lng: 60.61 })).to.be.closeTo(8.9, 0.3);
  });
});
