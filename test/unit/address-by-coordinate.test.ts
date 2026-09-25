import { expect } from "chai";
import { DefaultGeoAdapter } from "../../adapters/geo/default/defaultGeo";
import { GeoAddress } from "../../interfaces/Geo";

const AddressModel = require("../../models/Address");

/**
 * "Detect my location": the geocoder's answer against the catalog, then the
 * nearest point, then free text, then nothing. The catalog is held in memory the
 * way `address.test.ts` holds it.
 */
describe("Address by coordinate", function () {
  const realAddress = (global as any).Address;
  const realSails = (global as any).sails;

  type Row = Record<string, any>;

  const city = "city-a";
  const bare = "city-bare";
  const other = "city-b";

  const row = (values: Row): Row => ({ parent: null, names: [], point: null, lo: null, hi: null, ...values });

  const rows: Row[] = [
    row({ id: "malysheva", city, type: "street", name: "Малышева" }),
    row({ id: "malysheva-145", city, parent: "malysheva", type: "house", name: "145", point: { lat: 56.8421, lon: 60.664 } }),
    row({ id: "malysheva-145a", city, parent: "malysheva", type: "house", name: "145а", point: { lat: 56.8423, lon: 60.6645 } }),
    row({ id: "malysheva-low", city, parent: "malysheva", type: "range", name: "1–99", lo: 1, hi: 99, point: { lat: 56.836, lon: 60.61 } }),
    row({ id: "lenina", city, type: "street", name: "Ленина", names: ["Lenina"] }),
    row({ id: "lenina-97", city, parent: "lenina", type: "house", name: "97", point: { lat: 56.8429, lon: 60.6408 } }),
    row({ id: "hotel", city, type: "place", name: "Гостиница", point: { lat: 56.9, lon: 60.7 } }),

    // A city whose catalog has streets and no points at all.
    row({ id: "bare-street", city: bare, type: "street", name: "Садовая" }),

    // Exactly where `nearHouse145` stands, and in another city's catalog.
    row({ id: "elsewhere", city: other, type: "place", name: "Чужое", point: { lat: 56.84211, lon: 60.66401 } }),
  ];

  function matches(row: Row, criteria: Row): boolean {
    return Object.entries(criteria).every(([key, value]) => (row[key] ?? null) === (value ?? null));
  }

  before(function () {
    (global as any).Address = {
      ...AddressModel,
      async find(criteria: Row) {
        return rows.filter((row) => matches(row, criteria));
      },
      async findOne(criteria: Row) {
        return rows.find((row) => matches(row, criteria));
      },
    };
    (global as any).sails = { log: { warn() {} } };
  });

  after(function () {
    (global as any).Address = realAddress;
    (global as any).sails = realSails;
  });

  /** A geo adapter whose reverse lookup says `answer`. */
  function geocoder(answer: GeoAddress | null | Error): DefaultGeoAdapter {
    return new (class extends DefaultGeoAdapter {
      protected async geocode() {
        return null;
      }
      protected async reverse() {
        if (answer instanceof Error) throw answer;
        return answer;
      }
    })();
  }

  const nearHouse145 = { lat: 56.84211, lon: 60.66401 };

  describe("the geocoder answered and the catalog knows it", function () {
    it("gives the house node, its line and its point", async function () {
      const geo = geocoder({ street: "улица Малышева", home: "145", formatted: "улица Малышева, 145" });

      const address = await geo.addressByCoordinate({ lat: 56.85, lon: 60.7 }, city);

      expect(address).to.deep.equal({
        node: "malysheva-145",
        formatted: "Малышева, 145",
        home: undefined,
        coordinate: { lat: 56.8421, lon: 60.664 },
      });
    });

    it("finds the street by an alias as well as by its name", async function () {
      const geo = geocoder({ street: "Lenina Avenue", home: "97", formatted: "Lenina Avenue, 97" });

      const address = await geo.addressByCoordinate(nearHouse145, city);

      expect(address?.node).to.equal("lenina-97");
    });

    it("tells a house with a letter from the one without", async function () {
      const geo = geocoder({ street: "улица Малышева", home: "145 А", formatted: "улица Малышева, 145 А" });

      const address = await geo.addressByCoordinate(nearHouse145, city);

      expect(address?.node).to.equal("malysheva-145a");
    });

    it("gives a range with the geocoder's number when the house itself is not in the catalog", async function () {
      const geo = geocoder({ street: "улица Малышева", home: "45", formatted: "улица Малышева, 45" });

      const address = await geo.addressByCoordinate(nearHouse145, city);

      expect(address).to.deep.equal({
        node: "malysheva-low",
        formatted: "Малышева, 45",
        home: "45",
        coordinate: { lat: 56.836, lon: 60.61 },
      });
    });

    it("gives the street with the geocoder's number when nothing under it covers the house", async function () {
      const geo = geocoder({ street: "проспект Ленина", home: "12", formatted: "проспект Ленина, 12" });
      const requested = { lat: 56.84, lon: 60.61 };

      const address = await geo.addressByCoordinate(requested, city);

      // A street has no point of its own: the coordinate asked about stands in.
      expect(address).to.deep.equal({ node: "lenina", formatted: "Ленина, 12", home: "12", coordinate: requested });
    });
  });

  describe("the catalog does not know what the geocoder said", function () {
    it("gives the nearest node with a point, however far", async function () {
      const geo = geocoder({ street: "улица Неизвестная", home: "1", formatted: "улица Неизвестная, 1" });

      const address = await geo.addressByCoordinate(nearHouse145, city);

      expect(address?.node).to.equal("malysheva-145");
      expect(address?.coordinate).to.deep.equal({ lat: 56.8421, lon: 60.664 });
    });

    it("does the same for a street the geocoder named without a house number", async function () {
      const geo = geocoder({ street: "улица Малышева", formatted: "улица Малышева" });

      const address = await geo.addressByCoordinate({ lat: 56.9, lon: 60.71 }, city);

      expect(address?.node).to.equal("hotel");
      expect(address?.formatted).to.equal("Гостиница");
    });
  });

  describe("the geocoder had nothing to say", function () {
    it("gives the nearest node with a point", async function () {
      const address = await geocoder(null).addressByCoordinate({ lat: 56.836, lon: 60.61 }, city);

      expect(address?.node).to.equal("malysheva-low");
      expect(address?.home).to.equal(undefined);
    });

    it("treats a geocoder that failed as one that had nothing to say", async function () {
      const address = await geocoder(new Error("network down")).addressByCoordinate(nearHouse145, city);

      expect(address?.node).to.equal("malysheva-145");
    });
  });

  describe("a catalog without points", function () {
    it("gives the geocoder's address as free text at the coordinate asked about", async function () {
      const geo = geocoder({ city: "City name", street: "улица Лесная", home: "3", formatted: "улица Лесная, 3" });
      const requested = { lat: 55, lon: 37 };

      const address = await geo.addressByCoordinate(requested, bare);

      // A line and a house number, the way the storefront sends free text.
      expect(address).to.deep.equal({ node: null, formatted: "улица Лесная", home: "3", coordinate: requested });
    });

    it("gives the whole line when the geocoder knows no street", async function () {
      const geo = geocoder({ formatted: "Парк Победы" });

      const address = await geo.addressByCoordinate({ lat: 55, lon: 37 }, bare);

      expect(address?.node).to.equal(null);
      expect(address?.formatted).to.equal("Парк Победы");
    });

    it("is null when the geocoder is silent too", async function () {
      const address = await geocoder(null).addressByCoordinate({ lat: 55, lon: 37 }, bare);

      expect(address).to.equal(null);
    });
  });
});
