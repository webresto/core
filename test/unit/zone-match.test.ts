import { expect } from "chai";
import {
  findZoneForCoordinate,
  isPointInRing,
  isValidPolygon,
  nearestPlaceInZone,
} from "../../adapters/delivery/default/zone-match";
// Reading a coordinate off an address is not zone geometry and moved to core
// with `locateAddress`; the assertions stay here, next to the geometry they feed.
import { coordinateFromAddress } from "../../lib/delivery-location";

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
      expect(isPointInRing({ lat: 10, lng: 10 }, square)).to.equal(true);
      expect(isPointInRing({ lat: 10, lng: 12 }, square)).to.equal(false);
      expect(isPointInRing({ lat: 11.0001, lng: 10 }, square)).to.equal(false);
    });

    it("serves an address sitting exactly on the border", function () {
      expect(isPointInRing({ lat: 9, lng: 10 }, square)).to.equal(true);
      expect(isPointInRing({ lat: 9, lng: 9 }, square)).to.equal(true);
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
      expect(isPointInRing({ lat: 1, lng: 1 }, lShape)).to.equal(true);
      expect(isPointInRing({ lat: 3, lng: 3 }, lShape)).to.equal(false);
    });
  });

  describe("zone selection", function () {
    const big = { id: "big", polygon: [[0, 0], [20, 0], [20, 20], [0, 20], [0, 0]] };
    const small = { id: "small", polygon: square };

    it("takes the first match, so sortOrder decides overlaps", function () {
      expect(findZoneForCoordinate([small, big], { lat: 10, lng: 10 })?.id).to.equal("small");
      expect(findZoneForCoordinate([big, small], { lat: 10, lng: 10 })?.id).to.equal("big");
    });

    it("returns null outside every zone", function () {
      expect(findZoneForCoordinate([small, big], { lat: 50, lng: 50 })).to.equal(null);
    });

    it("skips zones with an unusable polygon instead of throwing", function () {
      expect(findZoneForCoordinate([{ id: "broken", polygon: [[0, 0]] }, small], { lat: 10, lng: 10 })?.id)
        .to.equal("small");
    });
  });

  describe("kitchen in zone", function () {
    const zone = { id: "z", polygon: square };
    const customer = { lat: 10.5, lng: 10.5 };
    const inside = { id: "inside", coordinate: { lat: 10, lng: 10 } };
    const nearer = { id: "nearer", coordinate: { lat: 10.4, lng: 10.4 } };
    const outside = { id: "outside", coordinate: { lat: 10.6, lng: 12 } };

    it("takes the kitchen standing inside the polygon", function () {
      expect(nearestPlaceInZone(zone, customer, [outside, inside])).to.equal("inside");
    });

    it("prefers the nearest of several kitchens inside", function () {
      expect(nearestPlaceInZone(zone, customer, [inside, nearer])).to.equal("nearer");
    });

    it("breaks a tie by id", function () {
      const twinA = { id: "a", coordinate: { lat: 10, lng: 10 } };
      const twinB = { id: "b", coordinate: { lat: 10, lng: 10 } };
      expect(nearestPlaceInZone(zone, customer, [twinB, twinA])).to.equal("a");
    });

    it("returns null when no kitchen is inside", function () {
      expect(nearestPlaceInZone(zone, customer, [outside, { id: "blind", coordinate: null }])).to.equal(null);
      expect(nearestPlaceInZone({ id: "broken", polygon: [[0, 0]] }, customer, [inside])).to.equal(null);
    });
  });

  describe("address coordinate", function () {
    it("reads the string pair stored on an address", function () {
      expect(coordinateFromAddress({ coordinate: { lat: "55.75", lon: "37.61" } }))
        .to.deep.equal({ lat: 55.75, lng: 37.61 });
    });

    it("returns null for anything unusable", function () {
      expect(coordinateFromAddress({ coordinate: { lat: "abc", lon: "37.61" } })).to.equal(null);
      expect(coordinateFromAddress({ coordinate: { lat: "95", lon: "0" } })).to.equal(null);
      expect(coordinateFromAddress({})).to.equal(null);
      expect(coordinateFromAddress(null)).to.equal(null);
    });
  });
});
