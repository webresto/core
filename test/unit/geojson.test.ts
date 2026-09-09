import { expect } from "chai";
import { parseGeoJson } from "../../adapters/delivery/default/geojson";

/**
 * The GeoJSON half of the zone upload.
 *
 * Pure text in, zones out — no model, no stand. What is worth pinning down is
 * which shapes become how many zones, and that a degenerate ring does not take
 * the rest of the file with it.
 */
describe("GeoJSON zones", function () {
  const square = [
    [60.5, 56.8],
    [60.7, 56.8],
    [60.7, 56.9],
    [60.5, 56.9],
    [60.5, 56.8],
  ];
  const otherSquare = square.map(([lon, lat]) => [lon + 1, lat]);

  function feature(geometry: any, name?: string) {
    return { type: "Feature", properties: name ? { name } : {}, geometry };
  }

  it("reads a bare Feature with a Polygon", function () {
    const zones = parseGeoJson(JSON.stringify(feature({ type: "Polygon", coordinates: [square] }, "Зона A")));

    expect(zones).to.have.length(1);
    expect(zones[0].name).to.equal("Зона A");
    expect(zones[0].polygon).to.deep.equal(square);
  });

  it("keeps only the outer ring of a polygon with a hole", function () {
    const hole = [[60.55, 56.82], [60.56, 56.82], [60.56, 56.83], [60.55, 56.82]];
    const zones = parseGeoJson(JSON.stringify(feature({ type: "Polygon", coordinates: [square, hole] })));

    expect(zones[0].polygon).to.deep.equal(square);
  });

  it("makes one zone per polygon of a MultiPolygon", function () {
    const zones = parseGeoJson(JSON.stringify(feature(
      { type: "MultiPolygon", coordinates: [[square], [otherSquare]] },
      "Зона B",
    )));

    expect(zones.map((zone) => zone.name)).to.deep.equal(["Зона B #1", "Зона B #2"]);
    expect(zones[1].polygon).to.deep.equal(otherSquare);
  });

  it("reads every feature of a FeatureCollection", function () {
    const zones = parseGeoJson(JSON.stringify({
      type: "FeatureCollection",
      features: [
        feature({ type: "Polygon", coordinates: [square] }, "A"),
        feature({ type: "Polygon", coordinates: [otherSquare] }, "B"),
      ],
    }));

    expect(zones.map((zone) => zone.name)).to.deep.equal(["A", "B"]);
  });

  it("names an unnamed feature by its place in the file", function () {
    const zones = parseGeoJson(JSON.stringify(feature({ type: "Polygon", coordinates: [square] })));

    expect(zones[0].name).to.equal("Zone 1");
  });

  it("hands on a ring that cannot enclose an area, named, for the import to reject", function () {
    // Closed, so three stored points are two distinct ones — a line, not a zone.
    const line = [[60.5, 56.8], [60.7, 56.8], [60.5, 56.8]];
    const zones = parseGeoJson(JSON.stringify({
      type: "FeatureCollection",
      features: [
        feature({ type: "Polygon", coordinates: [line] }, "Полоска"),
        feature({ type: "Polygon", coordinates: [square] }, "Зона A"),
      ],
    }));

    expect(zones.map((zone) => zone.name)).to.deep.equal(["Полоска", "Зона A"]);
  });

  it("ignores points and lines", function () {
    const zones = parseGeoJson(JSON.stringify({
      type: "FeatureCollection",
      features: [
        feature({ type: "Point", coordinates: [60.5, 56.8] }, "Кухня"),
        feature({ type: "Polygon", coordinates: [square] }, "Зона A"),
      ],
    }));

    expect(zones.map((zone) => zone.name)).to.deep.equal(["Зона A"]);
  });

  it("refuses a file with no polygon at all", function () {
    expect(() => parseGeoJson(JSON.stringify({ type: "FeatureCollection", features: [] })))
      .to.throw(/no polygon/);
  });

  it("refuses something that is not GeoJSON", function () {
    expect(() => parseGeoJson('{"nodes": []}')).to.throw(/Feature/);
    expect(() => parseGeoJson("not json at all")).to.throw(/not valid JSON/);
  });
});
