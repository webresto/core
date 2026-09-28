import { expect } from "chai";
import { nameMatches } from "../../lib/address/name-match";
import { formatAddressLine, formatAddressPath } from "../../lib/address/format";
import { DefaultGeoAdapter, SELF_ADDRESSED } from "../../adapters/geo/default/defaultGeo";

const AddressModel = require("../../models/Address");

/** The catalog's own rules, with a geocoder that must never be reached. */
class CatalogOnly extends DefaultGeoAdapter {
  protected async geocode(): Promise<never> {
    throw new Error("the geocoder was asked and should not have been");
  }
}

/**
 * The address catalog, without a stand.
 *
 * `Address.search` and `Address.path` are the two things the storefront calls on
 * every keystroke of the address input, and both are pure queries over rows —
 * so the rows are held in memory here and the model is bound to them the same
 * way `kitchen-resolver` binds `Place`.
 */
describe("Address catalog", function () {
  const realAddress = (global as any).Address;
  const geo = new CatalogOnly();

  type Row = Record<string, any>;

  const cityA = "city-a";
  const cityB = "city-b";
  const camp = "city-camp";

  const row = (values: Row): Row => ({
    parent: null, names: [], point: null, lo: null, hi: null, ...values,
  });

  const rows: Row[] = [
    row({ id: "oak", city: cityA, type: "street", name: "Oak", names: ["Quercus"] }),
    row({ id: "maple", city: cityA, type: "street", name: "Maple" }),
    row({ id: "oak-12", city: cityA, parent: "oak", type: "house", name: "12", point: { lat: 56.83, lon: 60.6 } }),
    row({ id: "oak-14", city: cityA, parent: "oak", type: "house", name: "14", point: { lat: 56.84, lon: 60.6 } }),
    row({ id: "oak-12-p3", city: cityA, parent: "oak-12", type: "entrance", name: "entrance 3" }),
    row({ id: "hotel", city: cityA, type: "place", name: "Seaside Inn", names: ["Harbour hotel"], point: { lat: 56.8, lon: 60.5 } }),
    row({ id: "hotel-cabin", city: cityA, parent: "hotel", type: "unit", name: "Cabin 7" }),

    // Two streets of one name in one city, told apart by the district above them.
    row({ id: "centre", city: cityA, type: "district", name: "Centre" }),
    row({ id: "centre-oak", city: cityA, parent: "centre", type: "street", name: "Oak" }),
    row({ id: "riverside", city: cityA, type: "district", name: "Riverside" }),

    // A street with blocks of numbers plus one house the catalog really has.
    row({ id: "maple-low", city: cityA, parent: "maple", type: "range", name: "1–99", lo: 1, hi: 99, point: { lat: 56.836, lon: 60.614 } }),
    row({ id: "maple-145", city: cityA, parent: "maple", type: "house", name: "145", point: { lat: 56.8421, lon: 60.664 } }),
    row({ id: "maple-all", city: cityA, parent: "maple", type: "range", name: "100–200", lo: 100, hi: 200 }),

    // A camp site has no streets: its tents hang off the city itself.
    row({ id: "tent-42", city: camp, type: "unit", name: "Tent 42", point: { lat: 57.1, lon: 60.1 } }),

    row({ id: "birch", city: cityB, type: "street", name: "Birch" }),
  ];

  /** Houses of one street, out of order on purpose: the sort is what is tested. */
  const numbered = ["10", "2a", "1", "2"].map((name, at) =>
    row({ id: `pine-${at}`, city: cityA, parent: "pine", type: "house", name }),
  );
  rows.push(row({ id: "pine", city: cityA, type: "street", name: "Pine" }), ...numbered);
  // An entrance of a house nobody has put on the map: only the geocoder can place it.
  rows.push(row({ id: "pine-10-p2", city: cityA, parent: "pine-0", type: "entrance", name: "2" }));

  /** A path deeper than the graph was ever expected to be. */
  const deep = Array.from({ length: 8 }, (_, at) =>
    row({ id: `deep-${at}`, city: cityA, parent: at ? `deep-${at - 1}` : null, type: at ? "unit" : "place", name: `U${at}` }),
  );
  rows.push(...deep);

  function matchesOne(row: Row, key: string, value: unknown): boolean {
    return Array.isArray(value) ? value.includes(row[key]) : (row[key] ?? null) === (value ?? null);
  }

  function matches(row: Row, criteria: Row): boolean {
    return Object.entries(criteria).every(([key, value]) =>
      key === "or"
        ? (value as Row[]).some((clause) => matches(row, clause))
        : matchesOne(row, key, value),
    );
  }

  before(async function () {
    (global as any).Address = {
      ...AddressModel,
      find(criteria: Row) {
        const found = rows.filter((row) => matches(row, criteria));
        return { sort: async () => found, then: (resolve: any) => resolve(found) };
      },
      async findOne(criteria: Row) {
        return rows.find((row) => matches(row, criteria));
      },
    };
  });

  after(function () {
    (global as any).Address = realAddress;
  });

  const names = (found: Row[]): string[] => found.map((node: Row) => node.name);

  describe("search", function () {
    it("does not offer a house number typed with nothing chosen yet", async function () {
      const found = await AddressModel.search({ city: cityA, query: "12" });
      expect(found).to.deep.equal([]);
    });

    it("offers the houses of the street once the street is chosen", async function () {
      const found = await AddressModel.search({ city: cityA, parent: "oak", query: "12" });
      expect(found.map((node: Row) => node.id)).to.deep.equal(["oak-12"]);
    });

    it("finds a street by a prefix of its name, whatever the case", async function () {
      expect(names(await AddressModel.search({ city: cityA, query: "MAP" }))).to.deep.equal(["Maple"]);
    });

    it("finds a node by an alias as readily as by its name", async function () {
      const found = await AddressModel.search({ city: cityA, query: "harbour" });
      expect(found.map((node: Row) => node.id)).to.deep.equal(["hotel"]);
    });

    it("keeps one city's catalog out of another's", async function () {
      const found = await AddressModel.search({ city: cityB, query: "oa" });
      expect(found).to.deep.equal([]);
    });

    it("finds a street that stands under a district, and both Oak streets at once", async function () {
      const found = await AddressModel.search({ city: cityA, query: "Oak" });
      expect(found.map((node: Row) => node.id)).to.have.members(["oak", "centre-oak"]);
    });

    it("finds what the city holds directly, whatever its type", async function () {
      // A tent is a `unit` — not a root type — but nothing stands above it.
      expect(names(await AddressModel.search({ city: camp, query: "42" }))).to.deep.equal(["Tent 42"]);
    });

    it("still keeps a house under a street out of the root", async function () {
      expect(await AddressModel.search({ city: cityA, query: "14" })).to.deep.equal([]);
    });
  });

  describe("ranges of house numbers", function () {
    const under = (query: string) => AddressModel.search({ city: cityA, parent: "maple", query });

    it("offers the block a typed number falls into", async function () {
      expect(names(await under("45a"))).to.deep.equal(["1–99"]);
    });

    it("covers both sides of the street: a block is just lo..hi", async function () {
      expect(names(await under("46"))).to.deep.equal(["1–99"]);
    });

    it("says nothing past the bounds", async function () {
      expect(await under("250")).to.deep.equal([]);
    });

    it("puts a house the catalog really has before the block that covers it", async function () {
      expect(names(await under("145"))).to.deep.equal(["145", "100–200"]);
    });

    it("is never matched by its own name: nobody types the bounds", async function () {
      expect(await under("–99")).to.deep.equal([]);
    });

    it("leaves no word in the address line — the typed number takes its place", async function () {
      const path = [
        { type: "street", name: "Maple" },
        { type: "range", name: "1–99" },
      ];
      expect(formatAddressLine(path, "45a", SELF_ADDRESSED)).to.equal("Maple, 45a");
    });
  });

  describe("order of suggestions", function () {
    it("reads house numbers the way a person does", async function () {
      const found = await AddressModel.search({ city: cityA, parent: "pine", query: "" });
      expect(names(found)).to.deep.equal(["1", "2", "2a", "10"]);
    });
  });

  describe("path", function () {
    it("reads from the city down to the node", async function () {
      const path = await AddressModel.path("oak-12");
      expect(formatAddressPath(path.map((node: Row) => node.name))).to.equal("Oak, 12");
    });

    it("goes as deep as the graph does", async function () {
      const path = await AddressModel.path("oak-12-p3");
      expect(formatAddressPath(path.map((node: Row) => node.name))).to.equal("Oak, 12, entrance 3");
    });

    it("is one node for a root", async function () {
      const path = await AddressModel.path("oak");
      expect(path.map((node: Row) => node.id)).to.deep.equal(["oak"]);
    });

    it("does not stop at the number of types there are", async function () {
      const path = await AddressModel.path("deep-7");
      expect(path).to.have.length(8);
    });
  });

  describe("as the storefront reads it", function () {
    it("names what is above each suggestion", async function () {
      const found = await geo.search({ city: cityA, query: "oa" });
      const byId = new Map(found.map((node) => [node.id, node]));
      expect(byId.get("oak")!.ancestors).to.deep.equal([]);
      expect(byId.get("centre-oak")!.ancestors).to.deep.equal(["Centre"]);
      expect(byId.get("centre-oak")!.parent).to.equal("centre");
    });

    it("gives every step of a path the names above it", async function () {
      const path = await geo.path("oak-12-p3");
      expect(path.map((node) => node.ancestors)).to.deep.equal([[], ["Oak"], ["Oak", "12"]]);
    });
  });

  describe("the line an order saves", function () {
    it("rebuilds it from the chosen node and does not ask for a number a house already has", async function () {
      expect(await geo.describe({ node: "oak-12", formatted: "whatever the client sent" } as never))
        .to.deep.equal({ formatted: "Oak, 12", selfAddressed: true });
    });

    it("adds the typed number to a street and still asks for one", async function () {
      expect(await geo.describe({ node: "oak", home: "5", formatted: "" } as never))
        .to.deep.equal({ formatted: "Oak, 5", selfAddressed: false });
    });

    it("keeps free text as typed", async function () {
      expect(await geo.describe({ node: null, formatted: "Oak, 5" } as never))
        .to.deep.equal({ formatted: "Oak, 5", selfAddressed: false });
    });
  });

  describe("where a node stands", function () {
    it("stands a node with no point of its own where its parent stands", async function () {
      const where = await geo.locate({ node: "hotel-cabin", home: null } as never);
      expect(where.coordinate).to.deep.equal({ lat: 56.8, lon: 60.5 });
      expect(where.diagnostics.join(" ")).to.contain('address-node (place "Seaside Inn")');
    });

    it("prefers the node's own point to the one above it", async function () {
      const where = await geo.locate({ node: "oak-12" });
      expect(where.coordinate).to.deep.equal({ lat: 56.83, lon: 60.6 });
      expect(where.diagnostics.join(" ")).to.contain('address-node (house "12")');
    });

    it("stands a range at its own middle", async function () {
      const where = await geo.locate({ node: "maple-low", home: "45a" });
      expect(where.coordinate).to.deep.equal({ lat: 56.836, lon: 60.614 });
    });

    it("geocodes an entrance by the house it is in, not by its own name", async function () {
      const asked: unknown[] = [];
      const recording = new (class extends DefaultGeoAdapter {
        protected async geocode(parts: { street: string; home: string; city?: string }) {
          asked.push(parts);
          return null;
        }
      })();

      await recording.locate({ node: "pine-10-p2" } as never);

      expect(asked).to.deep.equal([{ street: "Pine", home: "10", city: undefined }]);
    });
  });

  describe("what a node is allowed to be", function () {
    function create(values: Row): Promise<string | undefined> {
      return new Promise((resolve) => AddressModel.beforeCreate(values, resolve));
    }

    it("refuses a point that is not a point", async function () {
      const error = await create({ city: cityA, parent: "oak", type: "house", name: "16", point: { lat: 200, lon: 0 } });
      expect(error).to.match(/valid latitude and longitude/);
    });

    it("refuses a parent from another city", async function () {
      const error = await create({ city: cityB, parent: "oak", type: "house", name: "16" });
      expect(error).to.match(/another city/);
    });

    it("accepts a house under a street of the same city", async function () {
      const error = await create({ city: cityA, parent: "oak", type: "house", name: "16", point: { lat: 56.85, lon: 60.6 } });
      expect(error).to.equal(undefined);
    });

    it("refuses bounds on anything that is not a range", async function () {
      const error = await create({ city: cityA, parent: "oak", type: "house", name: "16", lo: 1, hi: 99 });
      expect(error).to.match(/those make a range/);
    });

    it("refuses a second Oak under the same district", async function () {
      const error = await create({ city: cityA, parent: "centre", type: "street", name: "Oak" });
      expect(error).to.match(/already exists here/);
    });

    it("accepts the same name under another district", async function () {
      const error = await create({ city: cityA, parent: "riverside", type: "street", name: "Oak" });
      expect(error).to.equal(undefined);
    });

    describe("types are the default geo adapter's", function () {
      it("refuses a type it does not declare", async function () {
        const error = await create({ city: cityA, type: "pier", name: "Pier 1" });
        expect(error).to.match(/Address type "pier" is unknown/);
      });

      it("checks the type an update writes, and only when it writes one", async function () {
        const update = (values: Row) => new Promise((resolve) => AddressModel.beforeUpdate(values, resolve));
        expect(await update({ type: "pier" })).to.match(/unknown/);
        expect(await update({ name: "Oak" })).to.equal(undefined);
      });
    });
  });
});

describe("Address name match", function () {
  it("finds the needle in the name or in an alias", function () {
    const node = { name: "Oak", names: ["Oak Ave.", "Quercus"] } as any;
    expect(nameMatches(node, "querc")).to.equal(true);
  });
});
