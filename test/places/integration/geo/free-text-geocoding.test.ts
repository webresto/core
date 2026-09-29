import { expect } from "chai";
import { nominatim } from "../../support/nominatim";
import { resetDatabase } from "../../support/reset";

/**
 * Where a free-text address stands: an address with no catalog node, which the
 * default geo adapter asks Nominatim's `/search` about. The catalog half — a
 * node's point and its ancestors' — is in `address-catalog`.
 */
describe("Free-text geocoding", function () {
  before(async function () {
    await resetDatabase();
  });

  afterEach(function () {
    nominatim.reply = undefined;
    nominatim.requests = [];
  });

  /** Nominatim's `/search` answers `point`. */
  function searchFinds(point: { lat: string; lon: string } | null) {
    nominatim.reply = (path) => (path === "search" ? (point ? [point] : []) : undefined);
  }

  const locate = async (address: Record<string, unknown>) => (await Adapter.get("geo")).locate(address as any);
  const asked = () => nominatim.requests.filter((request) => request.path === "search").map((request) => request.query.q);

  it("takes a coordinate the client supplied and asks nobody", async function () {
    searchFinds({ lat: "0", lon: "0" });

    const where = await locate({ formatted: "Street 1", home: "35", coordinate: { lat: 55.75, lon: 37.61 } });

    expect(where.coordinate).to.deep.equal({ lat: 55.75, lon: 37.61 });
    expect(asked()).to.deep.equal([]);
  });

  it("asks for the street and house number together, qualified by the customer's city", async function () {
    searchFinds({ lat: "57.15", lon: "65.53" });

    const where = await locate({ formatted: "Street 1", home: "1", city: "City 1" });

    expect(where.coordinate).to.deep.equal({ lat: 57.15, lon: 65.53 });
    expect(asked()).to.deep.equal(["City 1, Street 1, 1"]);
    expect(where.diagnostics).to.include("address point source: geocoder");
  });

  it("asks without a city when the address carries none", async function () {
    // Not a silent substitution: an unqualified query is the honest one, and the
    // refusal for a customer who named no city is checkout's, not the geocoder's.
    searchFinds({ lat: "57.15", lon: "65.53" });

    await locate({ formatted: "Street 1", home: "1" });

    expect(asked()).to.deep.equal(["Street 1, 1"]);
  });

  it("does not ask about a street without a house number", async function () {
    searchFinds({ lat: "1", lon: "1" });

    const where = await locate({ formatted: "Street 1" });

    expect(asked()).to.deep.equal([]);
    expect(where.coordinate).to.equal(null);
  });

  it("leaves an address Nominatim found nothing for without a coordinate, and says so", async function () {
    const where = await locate({ formatted: "Street 1", home: "35" });

    expect(where.coordinate).to.equal(null);
    expect(where.diagnostics.join(" ")).to.contain('geocoder found nothing for "Street 1 35"');
  });

  it("leaves an address without a coordinate when Nominatim is down, and says why", async function () {
    nominatim.reply = () => {
      throw new Error("down");
    };

    const where = await locate({ formatted: "Street 1", home: "35" });

    expect(where.coordinate).to.equal(null);
    expect(where.diagnostics.join(" ")).to.contain("geocoder failed:");
  });

  it("does not take an out-of-range answer for a coordinate", async function () {
    searchFinds({ lat: "999", lon: "0" });

    expect((await locate({ formatted: "Street 1", home: "35" })).coordinate).to.equal(null);
  });
});
