import { expect } from "chai";
import { nominatim } from "../../support/nominatim";
import { resetDatabase } from "../../support/reset";

/**
 * "Detect my location": what Nominatim says is at the coordinate, matched
 * against the city's catalog; failing that the catalog's nearest point, then
 * Nominatim's own words as free text, then nothing.
 *
 *   City 1: Street 1 with houses 145 and 145a and block 1–99; Street 2 (alias
 *           "Alias 2") with house 97; Place 1 with a point.
 *   City 2: Street 3 and no points at all.
 *   City 3: Place 2, standing exactly where City 1's house 145 is.
 */
describe("Address by coordinate", function () {
  const n: Record<string, any> = {};
  let city1: string;
  let city2: string;
  const nearHouse145 = { lat: 56.84211, lon: 60.66401 };

  before(async function () {
    await resetDatabase();
    city1 = (await City.create({ name: "City 1" }).fetch()).id;
    city2 = (await City.create({ name: "City 2" }).fetch()).id;
    const city3 = (await City.create({ name: "City 3" }).fetch()).id;

    const node = async (key: string, values: Record<string, unknown>) => {
      n[key] = await Address.create({ city: city1, ...values }).fetch();
    };
    await node("street1", { type: "street", name: "Street 1" });
    await node("house145", { parent: n.street1.id, type: "house", name: "145", point: { lat: 56.8421, lon: 60.664 } });
    await node("house145a", { parent: n.street1.id, type: "house", name: "145a", point: { lat: 56.8423, lon: 60.6645 } });
    await node("block1", { parent: n.street1.id, type: "range", name: "1–99", lo: 1, hi: 99, point: { lat: 56.836, lon: 60.61 } });
    await node("street2", { type: "street", name: "Street 2", names: ["Alias 2"] });
    await node("house97", { parent: n.street2.id, type: "house", name: "97", point: { lat: 56.8429, lon: 60.6408 } });
    await node("place1", { type: "place", name: "Place 1", point: { lat: 56.9, lon: 60.7 } });

    await Address.create({ city: city2, type: "street", name: "Street 3" }).fetch();
    await Address.create({ city: city3, type: "place", name: "Place 2", point: nearHouse145 }).fetch();
  });

  afterEach(function () {
    nominatim.reply = undefined;
  });

  /** Nominatim's reverse answer: a street, a house number, a city. */
  function reverseSays(address: Record<string, string>, displayName?: string) {
    nominatim.reply = (path) => (path === "reverse" ? { address, display_name: displayName } : undefined);
  }

  const lookUp = async (coordinate: { lat: number; lon: number }, city: string) =>
    (await Adapter.get("geo")).addressByCoordinate(coordinate, city);

  describe("Nominatim answered and the catalog knows it", function () {
    it("gives the house node, its line and its point", async function () {
      reverseSays({ road: "Street 1 Avenue", house_number: "145" });

      expect(await lookUp({ lat: 56.85, lon: 60.7 }, city1)).to.deep.equal({
        node: n.house145.id,
        formatted: "Street 1, 145",
        home: undefined,
        coordinate: { lat: 56.8421, lon: 60.664 },
      });
      expect(nominatim.requests.at(-1)).to.deep.include({ path: "reverse" });
      expect(nominatim.requests.at(-1)!.query).to.include({ lat: "56.85", lon: "60.7", zoom: "18" });
    });

    it("finds the street by an alias as well as by its name", async function () {
      reverseSays({ road: "Alias 2 Avenue", house_number: "97" });
      expect((await lookUp(nearHouse145, city1))?.node).to.equal(n.house97.id);
    });

    it("tells a house with a letter from the one without", async function () {
      reverseSays({ road: "Street 1 Avenue", house_number: "145 A" });
      expect((await lookUp(nearHouse145, city1))?.node).to.equal(n.house145a.id);
    });

    it("gives a block with Nominatim's number when the house itself is not in the catalog", async function () {
      reverseSays({ road: "Street 1 Avenue", house_number: "45" });

      expect(await lookUp(nearHouse145, city1)).to.deep.equal({
        node: n.block1.id,
        formatted: "Street 1, 45",
        home: "45",
        coordinate: { lat: 56.836, lon: 60.61 },
      });
    });

    it("gives the street with Nominatim's number when nothing under it covers the house", async function () {
      reverseSays({ road: "Street 2 Avenue", house_number: "12" });
      const asked = { lat: 56.84, lon: 60.61 };

      // A street has no point of its own: the coordinate asked about stands in.
      expect(await lookUp(asked, city1)).to.deep.equal({ node: n.street2.id, formatted: "Street 2, 12", home: "12", coordinate: asked });
    });
  });

  describe("the catalog does not know what Nominatim said", function () {
    it("gives the nearest node with a point, however far, and only from its own city", async function () {
      // City 3's Place 2 stands exactly at the coordinate; it is not City 1's.
      reverseSays({ road: "Street 9", house_number: "1" });

      const address = await lookUp(nearHouse145, city1);

      expect(address?.node).to.equal(n.house145.id);
      expect(address?.coordinate).to.deep.equal({ lat: 56.8421, lon: 60.664 });
    });

    it("does the same for a street named without a house number", async function () {
      reverseSays({ road: "Street 1 Avenue" });

      const address = await lookUp({ lat: 56.9, lon: 60.71 }, city1);

      expect(address?.node).to.equal(n.place1.id);
      expect(address?.formatted).to.equal("Place 1");
    });
  });

  describe("Nominatim had nothing to say", function () {
    it("gives the nearest node with a point", async function () {
      const address = await lookUp({ lat: 56.836, lon: 60.61 }, city1);

      expect(address?.node).to.equal(n.block1.id);
      expect(address?.home).to.equal(undefined);
    });

    it("treats a Nominatim that is down as one that had nothing to say", async function () {
      nominatim.reply = () => {
        throw new Error("down");
      };
      expect((await lookUp(nearHouse145, city1))?.node).to.equal(n.house145.id);
    });
  });

  describe("a catalog without points", function () {
    it("gives Nominatim's address as free text at the coordinate asked about", async function () {
      reverseSays({ city: "City 2", road: "Street 5", house_number: "3" });
      const asked = { lat: 55, lon: 37 };

      // A line and a house number, the way the storefront sends free text.
      expect(await lookUp(asked, city2)).to.deep.equal({ node: null, formatted: "Street 5", home: "3", coordinate: asked });
    });

    it("gives the whole line when Nominatim knows no street", async function () {
      reverseSays({}, "Park 1");

      const address = await lookUp({ lat: 55, lon: 37 }, city2);

      expect(address?.node).to.equal(null);
      expect(address?.formatted).to.equal("Park 1");
    });

    it("is null when Nominatim is silent too", async function () {
      expect(await lookUp({ lat: 55, lon: 37 }, city2)).to.equal(null);
    });
  });
});
