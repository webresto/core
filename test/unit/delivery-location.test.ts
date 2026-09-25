import { expect } from "chai";
import { DefaultGeoAdapter } from "../../adapters/geo/default/defaultGeo";

/**
 * The geocoder half of `GeoAdapter.locate`: free text with no catalog node. The
 * catalog half — a node's point and its ancestors' — is in `address.test.ts`.
 */
describe("Delivery location resolution", function () {
  type Parts = { street: string; home: string; city?: string };

  /** A geo adapter that records what it was asked and answers with `answer`. */
  function geocoder(answer: (parts: Parts) => Promise<{ lat: number; lon: number } | null>) {
    const asked: Parts[] = [];
    const geo = new (class extends DefaultGeoAdapter {
      protected async geocode(parts: Parts) {
        asked.push(parts);
        return answer(parts);
      }
    })();
    return { geo, asked };
  }

  it("prefers a coordinate supplied by the client over the geocoder", async function () {
    const { geo, asked } = geocoder(async () => ({ lat: 0, lon: 0 }));

    const where = await geo.locate({
      formatted: "Svobody",
      home: "35",
      coordinate: { lat: 55.75, lon: 37.61 },
    });

    expect(where.coordinate).to.deep.equal({ lat: 55.75, lon: 37.61 });
    expect(asked).to.deep.equal([]);
  });

  it("geocodes the street and house number together, qualified by the customer's city", async function () {
    const { geo, asked } = geocoder(async () => ({ lat: 57.15, lon: 65.53 }));

    const where = await geo.locate({ formatted: "Республики", home: "1", city: "City name" });

    expect(where.coordinate).to.deep.equal({ lat: 57.15, lon: 65.53 });
    expect(where.unrecognized).to.equal(false);
    expect(asked).to.deep.equal([{ street: "Республики", home: "1", city: "City name" }]);
    expect(where.diagnostics).to.include("address point source: geocoder");
  });

  it("geocodes without a city when the address carries none", async function () {
    // Not a silent substitution: an unqualified query is the honest one, and the
    // refusal for a customer who named no city is checkout's, not the geocoder's.
    const { geo, asked } = geocoder(async () => ({ lat: 57.15, lon: 65.53 }));

    await geo.locate({ formatted: "Республики", home: "1" });

    expect(asked).to.deep.equal([{ street: "Республики", home: "1", city: undefined }]);
  });

  it("does not ask about a street without a house number", async function () {
    const { geo, asked } = geocoder(async () => ({ lat: 1, lon: 1 }));

    const where = await geo.locate({ formatted: "Svobody" });

    expect(asked).to.deep.equal([]);
    expect(where.coordinate).to.equal(null);
    expect(where.unrecognized).to.equal(false);
  });

  it("calls an address the geocoder found nothing for unrecognised", async function () {
    const { geo } = geocoder(async () => null);

    const where = await geo.locate({ formatted: "Svobody", home: "35" });

    expect(where.coordinate).to.equal(null);
    expect(where.unrecognized).to.equal(true);
    expect(where.diagnostics.join(" ")).to.contain('geocoder found nothing for "Svobody 35"');
  });

  it("calls an address unrecognised when the geocoder fails, and says why", async function () {
    const { geo } = geocoder(async () => {
      throw new Error("network down");
    });

    const where = await geo.locate({ formatted: "Svobody", home: "35" });

    expect(where.coordinate).to.equal(null);
    expect(where.unrecognized).to.equal(true);
    expect(where.diagnostics).to.include("geocoder failed: network down");
  });

  it("does not take an out-of-range answer for a coordinate", async function () {
    const { geo } = geocoder(async () => ({ lat: 999, lon: 0 }));

    const where = await geo.locate({ formatted: "Svobody", home: "35" });

    expect(where.coordinate).to.equal(null);
    expect(where.unrecognized).to.equal(true);
  });
});
