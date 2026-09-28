import { expect } from "chai";
import { runLabelOf, syncTargets } from "../../adapters/delivery/default/zone-sync";

/**
 * Reading the source configuration.
 *
 * The city belongs here rather than in the extension registry: two modules
 * claiming to be the zone source is a conflict, two cities is one source doing
 * its job. Everything below is about turning one settings blob into the list of
 * fetches that follow from it.
 */
describe("Delivery zone sync targets", function () {
  it("treats a flat configuration as one city-less fetch", function () {
    expect(syncTargets({ url: "https://example.test/map.kml", timeoutMs: 5000 })).to.deep.equal([
      { city: null, config: { url: "https://example.test/map.kml", timeoutMs: 5000 } },
    ]);
  });

  it("survives an empty configuration", function () {
    expect(syncTargets({})).to.deep.equal([{ city: null, config: {} }]);
  });

  it("gives every city its own fetch, with the shared keys inherited", function () {
    const targets = syncTargets({
      timeoutMs: 15000,
      externalIdSource: "placemark-id",
      cities: [
        { city: "voronezh", url: "https://example.test/voronezh.kml" },
        { city: "lipetsk", url: "https://example.test/lipetsk.kml", timeoutMs: 30000 },
      ],
    });

    expect(targets).to.have.length(2);
    expect(targets[0]).to.deep.equal({
      city: "voronezh",
      config: {
        timeoutMs: 15000,
        externalIdSource: "placemark-id",
        city: "voronezh",
        url: "https://example.test/voronezh.kml",
      },
    });
    // The entry wins over the shared default.
    expect(targets[1]?.config.timeoutMs).to.equal(30000);
    // And `cities` itself never reaches the source.
    expect(targets[0]?.config).to.not.have.property("cities");
  });

  it("refuses a city listed twice", function () {
    // Both entries would import into the same rows, and the second would mark
    // everything the first wrote as missing from the source.
    expect(() =>
      syncTargets({ cities: [{ city: "voronezh", url: "a" }, { city: "voronezh", url: "b" }] }),
    ).to.throw(/twice/);
  });

  it("refuses an entry with no city", function () {
    expect(() => syncTargets({ cities: [{ url: "a" }] })).to.throw(/no city/);
  });

  it("refuses an empty cities list rather than syncing nothing", function () {
    expect(() => syncTargets({ cities: [] })).to.throw(/empty cities list/);
  });

  it("keys the sync state per city", function () {
    expect(runLabelOf("kml", null)).to.equal("kml");
    expect(runLabelOf("kml", "voronezh")).to.equal("kml:voronezh");
  });
});
