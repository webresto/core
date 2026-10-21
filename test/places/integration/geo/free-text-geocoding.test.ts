import { expect } from "chai";
import { geocoder } from "../../support/geocoder";
import { resetDatabase } from "../../support/reset";

/**
 * Where a typed address stands: a street and a house number rather than a
 * chosen house. The catalog's own and cached houses first, by the street's
 * words; then the geocoder, qualified by the customer's city, and the house it
 * finds is cached. The catalog half — a node's point and its ancestors' — is in
 * `address-catalog`.
 *
 *   City 1: Street 1 with house 10 at a point.
 */
describe("Free-text geocoding", function () {
  let city1: string;
  let street1: string;
  const HOUSE_10 = { lat: 57.15, lon: 65.53 };
  const HOUSE_11 = { lat: 57.151, lon: 65.53 };

  before(async function () {
    await resetDatabase();
    city1 = (await City.create({ name: "City 1" }).fetch()).id;
    street1 = (await Address.create({ city: city1, type: "street", name: "Street 1" }).fetch()).id;
    await Address.create({ city: city1, parent: street1, type: "house", name: "10", point: HOUSE_10 }).fetch();
  });

  afterEach(function () {
    geocoder.house = undefined;
    geocoder.requests = [];
  });

  const locate = async (address: Record<string, unknown>) => (await Adapter.get("geo")).locate(address as any);
  const asked = () => geocoder.requests.filter((request) => request.method === "house");
  /** The geocoder knows one house at `point`, whatever it is asked. */
  const knows = (street: string, home: string, point: { lat: number; lon: number }) => {
    geocoder.house = () => ({ street, home, point });
  };

  it("takes a coordinate the client supplied and asks nobody", async function () {
    knows("Street 1", "35", { lat: 0, lon: 0 });

    const where = await locate({ formatted: "Street 1", home: "35", coordinate: { lat: 55.75, lon: 37.61 } });

    expect(where.coordinate).to.deep.equal({ lat: 55.75, lon: 37.61 });
    expect(asked()).to.deep.equal([]);
  });

  it("takes the catalog's house by the street's words, asking nobody", async function () {
    knows("Street 1", "10", { lat: 0, lon: 0 });

    const where = await locate({ city: city1, formatted: "Street 1", home: "10" });

    expect(where.coordinate).to.deep.equal(HOUSE_10);
    expect(where.diagnostics.join(" ")).to.contain('address-node (house "10")');
    expect(asked()).to.deep.equal([]);
  });

  it("takes it under a chosen street too, and knows the city by its name as well", async function () {
    expect((await locate({ city: city1, node: street1, home: "10" })).coordinate).to.deep.equal(HOUSE_10);
    expect((await locate({ city: "City 1", formatted: "Street 1", home: "10" })).coordinate).to.deep.equal(HOUSE_10);
    expect(asked()).to.deep.equal([]);
  });

  it("asks the geocoder for a house the catalog has not, with the customer's city name, and caches it for the next time", async function () {
    knows("Street 1", "11", HOUSE_11);

    const where = await locate({ city: city1, formatted: "Street 1", home: "11" });

    expect(where.coordinate).to.deep.equal(HOUSE_11);
    expect(where.diagnostics).to.include("address point source: geocoder");
    expect(asked()).to.deep.equal([{ method: "house", city: "City 1", street: "Street 1", home: "11" }]);
    expect(await Address.findOne({ city: city1, parent: street1, name: "11" })).to.deep.include({ point: HOUSE_11, cache: { source: "test", street: "Street 1" } });

    geocoder.house = undefined;
    const again = await locate({ city: city1, formatted: "Street 1", home: "11" });
    expect(again.coordinate).to.deep.equal(HOUSE_11);
    expect(again.diagnostics.join(" ")).to.contain("cached from test");
    expect(asked()).to.have.length(1);
  });

  it("asks without a city when the address carries none, and caches nothing", async function () {
    // Not a silent substitution: an unqualified question is the honest one, and the
    // refusal for a customer who named no city is checkout's, not the geocoder's.
    knows("Street 7", "1", { lat: 57.2, lon: 65.5 });

    expect((await locate({ formatted: "Street 7", home: "1" })).coordinate).to.deep.equal({ lat: 57.2, lon: 65.5 });
    expect(asked()).to.deep.equal([{ method: "house", city: "", street: "Street 7", home: "1" }]);
    expect(await Address.count({ name: ["Street 7", "1"] })).to.equal(0);
  });

  it("does not ask about a street without a house number", async function () {
    knows("Street 1", "1", { lat: 1, lon: 1 });

    const where = await locate({ city: city1, formatted: "Street 1" });

    expect(asked()).to.deep.equal([]);
    expect(where.coordinate).to.equal(null);
  });

  it("leaves a house the geocoder does not know without a coordinate, says so, and does not ask again for a while", async function () {
    const where = await locate({ city: city1, formatted: "Street 1", home: "35" });
    const again = await locate({ city: city1, formatted: "Street 1", home: "35" });

    expect(where.coordinate).to.equal(null);
    expect(where.diagnostics.join(" ")).to.contain('geocoders found nothing for "Street 1 35"');
    expect(again.coordinate).to.equal(null);
    expect(asked()).to.have.length(1);
  });

  it("leaves an address without a coordinate when the geocoder is down, says why, and asks again the next time", async function () {
    geocoder.house = () => {
      throw new Error("down");
    };

    const where = await locate({ city: city1, formatted: "Street 1", home: "36" });
    await locate({ city: city1, formatted: "Street 1", home: "36" });

    expect(where.coordinate).to.equal(null);
    expect(where.diagnostics.join(" ")).to.contain("geocoder test failed:");
    expect(asked()).to.have.length(2);
  });

  it("does not take an out-of-range point for an answer", async function () {
    knows("Street 1", "37", { lat: 999, lon: 0 });

    expect((await locate({ city: city1, formatted: "Street 1", home: "37" })).coordinate).to.equal(null);
  });
});
