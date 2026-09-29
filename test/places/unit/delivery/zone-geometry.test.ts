import { expect } from "chai";
import {
  findZoneForCoordinate,
  isPointInRing,
  isValidPolygon,
  nearestPlaceInZone,
} from "../../../../adapters/delivery/default/zone-match";
// Reading a coordinate off an address is not zone geometry and lives in
// `lib/address`; the assertions stay here, next to the geometry they feed.
import { coordinateFromAddress } from "../../../../lib/address/coordinate";
import { distanceKm } from "../../../../lib/geo/utils";

describe("Delivery zone geometry", function () {
  // A square around (10, 10), stored the way KML stores rings: [lon, lat].
  const square = [
    [9, 9],
    [11, 9],
    [11, 11],
    [9, 11],
    [9, 9],
  ];

  describe("polygon validation", function () {
    it("accepts a closed ring", function () {
      expect(isValidPolygon(square)).to.equal(true);
    });

    it("rejects anything that cannot enclose an area", function () {
      expect(isValidPolygon([[0, 0], [1, 1]])).to.equal(false);
      // Three stored points, but only two distinct ones: a line, not an area.
      expect(isValidPolygon([[0, 0], [1, 1], [0, 0]])).to.equal(false);
      expect(isValidPolygon("nope")).to.equal(false);
      expect(isValidPolygon(null)).to.equal(false);
    });

    it("rejects coordinates outside the world", function () {
      expect(isValidPolygon([[0, 0], [1, 1], [2, 200]])).to.equal(false);
      expect(isValidPolygon([[400, 0], [1, 1], [2, 2]])).to.equal(false);
    });
  });

  describe("point in polygon", function () {
    it("separates inside from outside", function () {
      expect(isPointInRing({ lat: 10, lon: 10 }, square)).to.equal(true);
      expect(isPointInRing({ lat: 10, lon: 12 }, square)).to.equal(false);
      expect(isPointInRing({ lat: 11.0001, lon: 10 }, square)).to.equal(false);
    });

    it("serves an address sitting exactly on the border", function () {
      expect(isPointInRing({ lat: 9, lon: 10 }, square)).to.equal(true);
      expect(isPointInRing({ lat: 9, lon: 9 }, square)).to.equal(true);
    });

    it("handles a concave zone", function () {
      const lShape = [
        [0, 0],
        [4, 0],
        [4, 2],
        [2, 2],
        [2, 4],
        [0, 4],
        [0, 0],
      ];
      expect(isPointInRing({ lat: 1, lon: 1 }, lShape)).to.equal(true);
      expect(isPointInRing({ lat: 3, lon: 3 }, lShape)).to.equal(false);
    });
  });

  describe("zone selection", function () {
    // Zone 1 is the square, Zone 2 a large one around it.
    const zone1 = { id: "zone-1", polygon: square };
    const zone2 = { id: "zone-2", polygon: [[0, 0], [20, 0], [20, 20], [0, 20], [0, 0]] };

    it("takes the first match, so sortOrder decides overlaps", function () {
      expect(findZoneForCoordinate([zone1, zone2], { lat: 10, lon: 10 })?.id).to.equal("zone-1");
      expect(findZoneForCoordinate([zone2, zone1], { lat: 10, lon: 10 })?.id).to.equal("zone-2");
    });

    it("returns null outside every zone", function () {
      expect(findZoneForCoordinate([zone1, zone2], { lat: 50, lon: 50 })).to.equal(null);
    });

    it("skips zones with an unusable polygon instead of throwing", function () {
      expect(findZoneForCoordinate([{ id: "zone-broken", polygon: [[0, 0]] }, zone1], { lat: 10, lon: 10 })?.id)
        .to.equal("zone-1");
    });
  });

  describe("kitchen in zone", function () {
    const zone = { id: "zone-1", polygon: square };
    const customer = { lat: 10.5, lon: 10.5 };
    // Kitchen 1 and Kitchen 2 stand inside the zone, Kitchen 2 nearer the
    // customer; Kitchen 3 stands outside it.
    const kitchen1 = { id: "kitchen-1", coordinate: { lat: 10, lon: 10 } };
    const kitchen2 = { id: "kitchen-2", coordinate: { lat: 10.4, lon: 10.4 } };
    const kitchen3 = { id: "kitchen-3", coordinate: { lat: 10.6, lon: 12 } };

    it("takes the kitchen standing inside the polygon", function () {
      expect(nearestPlaceInZone(zone, customer, [kitchen3, kitchen1])).to.equal("kitchen-1");
    });

    it("prefers the nearest of several kitchens inside", function () {
      expect(nearestPlaceInZone(zone, customer, [kitchen1, kitchen2])).to.equal("kitchen-2");
    });

    it("breaks a tie by id", function () {
      const twin1 = { id: "kitchen-1", coordinate: { lat: 10, lon: 10 } };
      const twin2 = { id: "kitchen-2", coordinate: { lat: 10, lon: 10 } };
      expect(nearestPlaceInZone(zone, customer, [twin2, twin1])).to.equal("kitchen-1");
    });

    it("returns null when no kitchen is inside", function () {
      expect(nearestPlaceInZone(zone, customer, [kitchen3, { id: "kitchen-4", coordinate: null }])).to.equal(null);
      expect(nearestPlaceInZone({ id: "zone-broken", polygon: [[0, 0]] }, customer, [kitchen1])).to.equal(null);
    });
  });

  describe("address coordinate", function () {
    it("reads the pair stored on an address", function () {
      expect(coordinateFromAddress({ coordinate: { lat: 55.75, lon: 37.61 } } as any))
        .to.deep.equal({ lat: 55.75, lon: 37.61 });
    });

    it("returns null for anything unusable", function () {
      // Numbers only, and `lon`: a string pair or a `long` key is not a coordinate.
      expect(coordinateFromAddress({ coordinate: { lat: "55.75", lon: "37.61" } } as any)).to.equal(null);
      expect(coordinateFromAddress({ coordinate: { lat: 55.75, long: 37.61 } } as any)).to.equal(null);
      expect(coordinateFromAddress({ coordinate: { lat: 95, lon: 0 } } as any)).to.equal(null);
      expect(coordinateFromAddress({} as any)).to.equal(null);
      expect(coordinateFromAddress(null)).to.equal(null);
    });
  });

  describe("distance", function () {
    it("is in kilometres along the globe", function () {
      expect(distanceKm({ lat: 56.84, lon: 60.61 }, { lat: 56.84, lon: 60.61 })).to.equal(0);
      expect(distanceKm({ lat: 56.84, lon: 60.61 }, { lat: 56.92, lon: 60.61 })).to.be.closeTo(8.9, 0.3);
    });
  });
});
