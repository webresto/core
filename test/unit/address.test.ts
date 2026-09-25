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

  const ekb = "city-ekb";
  const tyumen = "city-tyumen";
  const camp = "city-camp";

  const row = (values: Row): Row => ({
    parent: null, names: [], point: null, lo: null, hi: null, ...values,
  });

  const rows: Row[] = [
    row({ id: "lenina", city: ekb, type: "street", name: "Ленина", names: ["Lenina"] }),
    row({ id: "malysheva", city: ekb, type: "street", name: "Малышева" }),
    row({ id: "lenina-12", city: ekb, parent: "lenina", type: "house", name: "12", point: { lat: 56.83, lon: 60.6 } }),
    row({ id: "lenina-14", city: ekb, parent: "lenina", type: "house", name: "14", point: { lat: 56.84, lon: 60.6 } }),
    row({ id: "lenina-12-p3", city: ekb, parent: "lenina-12", type: "entrance", name: "подъезд 3" }),
    row({ id: "hotel", city: ekb, type: "place", name: "гост. Прибалтийская", names: ["Baltic hotel"], point: { lat: 56.8, lon: 60.5 } }),
    row({ id: "hotel-cabin", city: ekb, parent: "hotel", type: "unit", name: "Домик 7" }),

    // Two "Ленина" in one city, told apart by the district above them.
    row({ id: "centre", city: ekb, type: "district", name: "Центр" }),
    row({ id: "centre-lenina", city: ekb, parent: "centre", type: "street", name: "Ленина" }),
    row({ id: "akadem", city: ekb, type: "district", name: "Академический" }),

    // Малышева: a block of numbers plus one house the catalog really has.
    row({ id: "malysheva-low", city: ekb, parent: "malysheva", type: "range", name: "1–99", lo: 1, hi: 99, point: { lat: 56.836, lon: 60.614 } }),
    row({ id: "malysheva-145", city: ekb, parent: "malysheva", type: "house", name: "145", point: { lat: 56.8421, lon: 60.664 } }),
    row({ id: "malysheva-all", city: ekb, parent: "malysheva", type: "range", name: "100–200", lo: 100, hi: 200 }),

    // A camp site has no streets: its tents hang off the city itself.
    row({ id: "tent-42", city: camp, type: "unit", name: "Шатёр 42", point: { lat: 57.1, lon: 60.1 } }),

    row({ id: "respubliki", city: tyumen, type: "street", name: "Республики" }),
  ];

  /** Houses of one street, out of order on purpose: the sort is what is tested. */
  const numbered = ["10", "2а", "1", "2"].map((name, at) =>
    row({ id: `ilyicha-${at}`, city: ekb, parent: "ilyicha", type: "house", name }),
  );
  rows.push(row({ id: "ilyicha", city: ekb, type: "street", name: "Ильича" }), ...numbered);

  /** A path deeper than the graph was ever expected to be. */
  const deep = Array.from({ length: 8 }, (_, at) =>
    row({ id: `deep-${at}`, city: ekb, parent: at ? `deep-${at - 1}` : null, type: at ? "unit" : "place", name: `У${at}` }),
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
      const found = await AddressModel.search({ city: ekb, query: "12" });
      expect(found).to.deep.equal([]);
    });

    it("offers the houses of the street once the street is chosen", async function () {
      const found = await AddressModel.search({ city: ekb, parent: "lenina", query: "12" });
      expect(found.map((node: Row) => node.id)).to.deep.equal(["lenina-12"]);
    });

    it("finds a street by a prefix of its name, whatever the case", async function () {
      expect(names(await AddressModel.search({ city: ekb, query: "МАЛЫШ" }))).to.deep.equal(["Малышева"]);
    });

    it("finds a node by an alias as readily as by its name", async function () {
      const found = await AddressModel.search({ city: ekb, query: "baltic" });
      expect(found.map((node: Row) => node.id)).to.deep.equal(["hotel"]);
    });

    it("keeps one city's catalog out of another's", async function () {
      const found = await AddressModel.search({ city: tyumen, query: "лени" });
      expect(found).to.deep.equal([]);
    });

    it("finds a street that stands under a district, and both Ленина at once", async function () {
      const found = await AddressModel.search({ city: ekb, query: "Ленина" });
      expect(found.map((node: Row) => node.id)).to.have.members(["lenina", "centre-lenina"]);
    });

    it("finds what the city holds directly, whatever its type", async function () {
      // A tent is a `unit` — not a root type — but nothing stands above it.
      expect(names(await AddressModel.search({ city: camp, query: "42" }))).to.deep.equal(["Шатёр 42"]);
    });

    it("still keeps a house under a street out of the root", async function () {
      expect(await AddressModel.search({ city: ekb, query: "14" })).to.deep.equal([]);
    });
  });

  describe("ranges of house numbers", function () {
    const under = (query: string) => AddressModel.search({ city: ekb, parent: "malysheva", query });

    it("offers the block a typed number falls into", async function () {
      expect(names(await under("45а"))).to.deep.equal(["1–99"]);
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
        { type: "street", name: "Малышева" },
        { type: "range", name: "1–99" },
      ];
      expect(formatAddressLine(path, "45а", SELF_ADDRESSED)).to.equal("Малышева, 45а");
    });
  });

  describe("order of suggestions", function () {
    it("reads house numbers the way a person does", async function () {
      const found = await AddressModel.search({ city: ekb, parent: "ilyicha", query: "" });
      expect(names(found)).to.deep.equal(["1", "2", "2а", "10"]);
    });
  });

  describe("path", function () {
    it("reads from the city down to the node", async function () {
      const path = await AddressModel.path("lenina-12");
      expect(formatAddressPath(path.map((node: Row) => node.name))).to.equal("Ленина, 12");
    });

    it("goes as deep as the graph does", async function () {
      const path = await AddressModel.path("lenina-12-p3");
      expect(formatAddressPath(path.map((node: Row) => node.name))).to.equal("Ленина, 12, подъезд 3");
    });

    it("is one node for a root", async function () {
      const path = await AddressModel.path("lenina");
      expect(path.map((node: Row) => node.id)).to.deep.equal(["lenina"]);
    });

    it("does not stop at the number of types there are", async function () {
      const path = await AddressModel.path("deep-7");
      expect(path).to.have.length(8);
    });
  });

  describe("as the storefront reads it", function () {
    it("names what is above each suggestion", async function () {
      const found = await geo.search({ city: ekb, query: "лени" });
      const byId = new Map(found.map((node) => [node.id, node]));
      expect(byId.get("lenina")!.ancestors).to.deep.equal([]);
      expect(byId.get("centre-lenina")!.ancestors).to.deep.equal(["Центр"]);
      expect(byId.get("centre-lenina")!.parent).to.equal("centre");
    });

    it("gives every step of a path the names above it", async function () {
      const path = await geo.path("lenina-12-p3");
      expect(path.map((node) => node.ancestors)).to.deep.equal([[], ["Ленина"], ["Ленина", "12"]]);
    });
  });

  describe("the line an order saves", function () {
    it("rebuilds it from the chosen node and does not ask for a number a house already has", async function () {
      expect(await geo.describe({ node: "lenina-12", formatted: "whatever the client sent" } as never))
        .to.deep.equal({ formatted: "Ленина, 12", selfAddressed: true });
    });

    it("adds the typed number to a street and still asks for one", async function () {
      expect(await geo.describe({ node: "lenina", home: "5", formatted: "" } as never))
        .to.deep.equal({ formatted: "Ленина, 5", selfAddressed: false });
    });

    it("keeps free text as typed", async function () {
      expect(await geo.describe({ node: null, formatted: "Ленина, 5" } as never))
        .to.deep.equal({ formatted: "Ленина, 5", selfAddressed: false });
    });
  });

  describe("where a node stands", function () {
    it("stands a node with no point of its own where its parent stands", async function () {
      const where = await geo.locate({ node: "hotel-cabin", home: null } as never);
      expect(where.coordinate).to.deep.equal({ lat: 56.8, lon: 60.5 });
      expect(where.diagnostics.join(" ")).to.contain('address-node (place "гост. Прибалтийская")');
    });

    it("prefers the node's own point to the one above it", async function () {
      const where = await geo.locate({ node: "lenina-12" });
      expect(where.coordinate).to.deep.equal({ lat: 56.83, lon: 60.6 });
      expect(where.diagnostics.join(" ")).to.contain('address-node (house "12")');
    });

    it("stands a range at its own middle", async function () {
      const where = await geo.locate({ node: "malysheva-low", home: "45а" });
      expect(where.coordinate).to.deep.equal({ lat: 56.836, lon: 60.614 });
    });
  });

  describe("what a node is allowed to be", function () {
    function create(values: Row): Promise<string | undefined> {
      return new Promise((resolve) => AddressModel.beforeCreate(values, resolve));
    }

    it("refuses a point that is not a point", async function () {
      const error = await create({ city: ekb, parent: "lenina", type: "house", name: "16", point: { lat: 200, lon: 0 } });
      expect(error).to.match(/valid latitude and longitude/);
    });

    it("refuses a parent from another city", async function () {
      const error = await create({ city: tyumen, parent: "lenina", type: "house", name: "16" });
      expect(error).to.match(/another city/);
    });

    it("accepts a house under a street of the same city", async function () {
      const error = await create({ city: ekb, parent: "lenina", type: "house", name: "16", point: { lat: 56.85, lon: 60.6 } });
      expect(error).to.equal(undefined);
    });

    it("refuses bounds on anything that is not a range", async function () {
      const error = await create({ city: ekb, parent: "lenina", type: "house", name: "16", lo: 1, hi: 99 });
      expect(error).to.match(/those make a range/);
    });

    it("refuses a second Ленина under the same district", async function () {
      const error = await create({ city: ekb, parent: "centre", type: "street", name: "Ленина" });
      expect(error).to.match(/already exists here/);
    });

    it("accepts the same name under another district", async function () {
      const error = await create({ city: ekb, parent: "akadem", type: "street", name: "Ленина" });
      expect(error).to.equal(undefined);
    });

    describe("types are the default geo adapter's", function () {
      it("refuses a type it does not declare", async function () {
        const error = await create({ city: ekb, type: "pier", name: "Причал 1" });
        expect(error).to.match(/Address type "pier" is unknown/);
      });

      it("checks the type an update writes, and only when it writes one", async function () {
        const update = (values: Row) => new Promise((resolve) => AddressModel.beforeUpdate(values, resolve));
        expect(await update({ type: "pier" })).to.match(/unknown/);
        expect(await update({ name: "Ленина" })).to.equal(undefined);
      });
    });
  });
});

describe("Address name match", function () {
  it("finds the needle in the name or in an alias", function () {
    const node = { name: "Ленина", names: ["пр. Ленина", "Lenina"] } as any;
    expect(nameMatches(node, "lenin")).to.equal(true);
  });
});
