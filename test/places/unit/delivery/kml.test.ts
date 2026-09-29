import { expect } from "chai";
import { parseKml, toKmlUrl } from "../../../../adapters/delivery/default/kml";

/**
 * A KML map as the zone source reads it: which placemarks become zones, which
 * folder becomes a layer, and where a zone's stable id comes from. Any doubt
 * about an id fails the whole map rather than importing part of it.
 */
describe("KML zones", function () {
  const RING = "9,9,0 11,9,0 11,11,0 9,11,0 9,9,0";

  const polygon = (coordinates = RING) =>
    `<Polygon><outerBoundaryIs><LinearRing><coordinates>${coordinates}</coordinates></LinearRing></outerBoundaryIs></Polygon>`;
  const placemark = (name: string, attrs = "", inner = polygon()) => `<Placemark${attrs}><name>${name}</name>${inner}</Placemark>`;
  const kml = (body: string) => `<?xml version="1.0"?><kml><Document>${body}</Document></kml>`;
  const failure = async (xml: string, config = {}) => {
    try {
      await parseKml(xml, config);
      return null;
    } catch (error: any) {
      return error.code;
    }
  };

  it("makes a zone of every polygon, a layer of every named folder, and skips pins", async function () {
    const zones = await parseKml(kml(
      placemark("Zone 1", ' id="external-1"') +
      `<Folder><name>Layer 1</name>${placemark("Zone 2", ' id="external-2"')}` +
      `<Placemark><name>Kitchen 1</name><Point><coordinates>10,10,0</coordinates></Point></Placemark></Folder>`,
    ));

    expect(zones.map((zone) => [zone.externalId, zone.name, zone.layer?.name ?? null])).to.deep.equal([
      ["external-1", "Zone 1", null],
      ["external-2", "Zone 2", "Layer 1"],
    ]);
    // A folder's id is namespaced away from placemark ids.
    expect(zones[1].layer!.externalId).to.equal("layer:Layer 1");
    // [lon, lat], altitude dropped.
    expect(zones[0].polygon[1]).to.deep.equal([11, 9]);
  });

  it("takes the id from the placemark, then from ExtendedData, and from the name only when told to", async function () {
    const extended = `<Placemark><name>Zone 1</name><ExtendedData><Data name="externalId"><value>external-1</value></Data></ExtendedData>${polygon()}</Placemark>`;
    expect((await parseKml(kml(extended)))[0].externalId).to.equal("external-1");

    expect(await failure(kml(placemark("Zone 1")))).to.equal("DELIVERY_ZONE_EXTERNAL_ID_MISSING");
    expect((await parseKml(kml(placemark("Zone 1")), { externalIdSource: "name" }))[0].externalId).to.equal("Zone 1");
  });

  it("fails the whole map on a polygon that cannot enclose an area, a repeated id, or no polygon at all", async function () {
    expect(await failure(kml(placemark("Zone 1", ' id="external-1"', polygon("9,9 11,9 9,9"))))).to.equal("DELIVERY_ZONE_GEOMETRY_INVALID");
    expect(await failure(kml(placemark("Zone 1", ' id="external-1"') + placemark("Zone 2", ' id="external-1"'))))
      .to.equal("DELIVERY_ZONE_EXTERNAL_ID_DUPLICATE");
    expect(await failure(kml("<Placemark><name>Kitchen 1</name><Point><coordinates>10,10,0</coordinates></Point></Placemark>"))).to.equal("DELIVERY_ZONE_SOURCE_EMPTY");
    expect(await failure("not xml")).to.equal("DELIVERY_ZONE_KML_UNPARSEABLE");
  });

  it("turns a My Maps viewer link into its KML export and leaves any other URL alone", function () {
    expect(toKmlUrl("https://www.google.com/maps/d/viewer?mid=map-1&ll=1,2"))
      .to.equal("https://www.google.com/maps/d/kml?mid=map-1&forcekml=1");
    expect(toKmlUrl("https://maps.example/zones.kml")).to.equal("https://maps.example/zones.kml");
    expect(() => toKmlUrl("")).to.throw(/not configured/);
  });
});
