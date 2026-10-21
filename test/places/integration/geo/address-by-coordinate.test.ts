import { expect } from "chai";
import { geocoder } from "../../support/geocoder";
import { resetDatabase } from "../../support/reset";

/**
 * A click on the map: a place of the city's catalog, ours or cached, closer than
 * 10 m is landed on; else the house the geocoder finds nearest, cached so the
 * next click takes it from the catalog; else nothing, and the customer types
 * the address.
 *
 *   City 1: Street 1 with houses 145 and 145a and block 1–99; Street 2 (alias
 *           "Alias 2") with house 97; Place 1 with a point; Street 5 and
 *           Avenue 5, which the line "Street 5 Avenue" could both be.
 *   City 2: Place 2, standing exactly where City 1's house 145 is.
 */
describe("Address by coordinate", function () {
  const n: Record<string, any> = {};
  let city1: string;
  let city2: string;
  const HOUSE_145 = { lat: 56.8421, lon: 60.664 };
  /** About 5 m north of house 145. */
  const NEAR_145 = { lat: 56.842145, lon: 60.664 };

  before(async function () {
    await resetDatabase();
    city1 = (await City.create({ name: "City 1" }).fetch()).id;
    city2 = (await City.create({ name: "City 2" }).fetch()).id;

    const node = async (key: string, values: Record<string, unknown>) => {
      n[key] = await Address.create({ city: city1, ...values }).fetch();
    };
    await node("street1", { type: "street", name: "Street 1" });
    await node("house145", { parent: n.street1.id, type: "house", name: "145", point: HOUSE_145 });
    await node("house145a", { parent: n.street1.id, type: "house", name: "145a", point: { lat: 56.8423, lon: 60.6645 } });
    await node("block1", { parent: n.street1.id, type: "range", name: "1–99", lo: 1, hi: 99, point: { lat: 56.836, lon: 60.61 } });
    await node("street2", { type: "street", name: "Street 2", names: ["Alias 2"] });
    await node("house97", { parent: n.street2.id, type: "house", name: "97", point: { lat: 56.8429, lon: 60.6408 } });
    await node("place1", { type: "place", name: "Place 1", point: { lat: 56.9, lon: 60.7 } });
    await node("street5", { type: "street", name: "Street 5" });
    await node("avenue5", { type: "street", name: "Avenue 5" });

    n.place2 = await Address.create({ city: city2, type: "place", name: "Place 2", point: HOUSE_145 }).fetch();
  });

  afterEach(function () {
    geocoder.around = undefined;
    geocoder.requests = [];
  });

  const lookUp = async (coordinate: { lat: number; lon: number }, city: string) =>
    (await Adapter.get("geo")).addressByCoordinate(coordinate, city);
  /** The geocoder finds one house around any point. */
  const finds = (street: string, home: string, point: { lat: number; lon: number }) => {
    geocoder.around = () => [{ street, home, point }];
  };
  const asked = () => geocoder.requests.filter((request) => request.method === "housesAround");
  const cached = async (id: string | null | undefined) => await Address.findOne({ id: id! });

  describe("a place of the catalog closer than 10 m", function () {
    it("is landed on: its node, its line and its point, and no geocoder is asked", async function () {
      finds("Street 9", "1", { lat: 56.85, lon: 60.7 });

      expect(await lookUp(NEAR_145, city1)).to.deep.equal({ node: n.house145.id, formatted: "Street 1, 145", home: undefined, coordinate: HOUSE_145 });
      expect(asked()).to.deep.equal([]);
    });

    it("is a place as well as a house", async function () {
      expect(await lookUp({ lat: 56.90004, lon: 60.7 }, city1)).to.deep.include({ node: n.place1.id, formatted: "Place 1" });
    });

    it("is the clicked city's own", async function () {
      expect((await lookUp(HOUSE_145, city2))?.node).to.equal(n.place2.id);
      expect((await lookUp(HOUSE_145, city1))?.node).to.equal(n.house145.id);
    });

    it("is not a block: a range of numbers is not a place to land on", async function () {
      expect(await lookUp({ lat: 56.836, lon: 60.61 }, city1)).to.equal(null);
      expect(asked()).to.have.length(1);
    });
  });

  describe("further: the geocoder", function () {
    it("is asked for the houses within 100 m; the nearest is landed on, cached under our street, and the next click takes it from the catalog", async function () {
      const house = { lat: 56.8445, lon: 60.664 };
      const click = { lat: 56.8446, lon: 60.664 };
      finds("Street 1", "201", house);

      const address = await lookUp(click, city1);

      expect(address).to.deep.include({ formatted: "Street 1, 201", home: undefined, coordinate: house });
      expect(await cached(address?.node)).to.deep.include({ parent: n.street1.id, type: "house", name: "201", point: house, cache: { source: "test", street: "Street 1" } });
      expect(asked()).to.deep.equal([{ method: "housesAround", point: click, radiusMeters: 100 }]);

      // About 5 m from the cached house: the catalog answers.
      expect((await lookUp({ lat: 56.84455, lon: 60.664 }, city1))?.node).to.equal(address?.node);
      expect(asked()).to.have.length(1);
    });

    it("finds our street by an alias as well as by its name", async function () {
      finds("Alias 2", "99", { lat: 56.8432, lon: 60.6408 });
      expect((await cached((await lookUp({ lat: 56.8433, lon: 60.6408 }, city1))?.node))?.parent).to.equal(n.street2.id);
    });

    it("hangs the houses of a street the catalog has not under one cached street", async function () {
      finds("Street 9", "1", { lat: 56.85, lon: 60.7 });
      const first = await lookUp({ lat: 56.8501, lon: 60.7 }, city1);
      finds("Street 9", "3", { lat: 56.851, lon: 60.7 });
      const second = await lookUp({ lat: 56.8511, lon: 60.7 }, city1);

      const street = await cached((await cached(first?.node))?.parent);
      expect(first?.formatted).to.equal("Street 9, 1");
      expect(street).to.deep.include({ parent: null, type: "street", name: "Street 9", cache: { source: "test", street: "Street 9" } });
      expect((await cached(second?.node))?.parent).to.equal(street.id);
    });

    it("hangs a house under a cached street when two of our streets could be its line", async function () {
      finds("Street 5 Avenue", "1", { lat: 56.86, lon: 60.7 });

      const street = await cached((await cached((await lookUp({ lat: 56.8601, lon: 60.7 }, city1))?.node))?.parent);

      expect(street).to.deep.include({ name: "Street 5 Avenue", cache: { source: "test", street: "Street 5 Avenue" } });
    });

    it("takes our house of that number rather than caching a twin", async function () {
      const before = await Address.count({ city: city1 });
      finds("Street 1", "145", { lat: 56.87, lon: 60.67 });

      expect((await lookUp({ lat: 56.8701, lon: 60.67 }, city1))?.node).to.equal(n.house145.id);
      expect(await Address.count({ city: city1 })).to.equal(before);
    });

    it("takes our place closer than 10 m to the house found, whatever the geocoder calls it", async function () {
      finds("Street 77", "5", { lat: 56.84291, lon: 60.6408 });
      expect((await lookUp({ lat: 56.8431, lon: 60.6408 }, city1))?.node).to.equal(n.house97.id);
    });

    it("takes nothing but a house with its number", async function () {
      finds("Street 1", "", { lat: 56.88, lon: 60.7 });
      expect(await lookUp({ lat: 56.8801, lon: 60.7 }, city1)).to.equal(null);
    });
  });

  describe("nothing found", function () {
    it("is null, and the same spot is not asked again for a while", async function () {
      geocoder.around = () => [];
      const spot = { lat: 56.89, lon: 60.6 };

      expect(await lookUp(spot, city1)).to.equal(null);
      expect(await lookUp(spot, city1)).to.equal(null);
      expect(asked()).to.have.length(1);
    });

    it("from a geocoder that is down is null too, and it is asked again the next time", async function () {
      geocoder.around = () => {
        throw new Error("down");
      };
      const spot = { lat: 56.89, lon: 60.65 };

      expect(await lookUp(spot, city1)).to.equal(null);
      expect(await lookUp(spot, city1)).to.equal(null);
      expect(asked()).to.have.length(2);
    });
  });
});
