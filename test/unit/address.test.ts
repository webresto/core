import { expect } from "chai";
import { formatAddressPath } from "../../lib/address";

const AddressModel = require("../../models/Address");

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

  type Row = Record<string, any>;

  const ekb = "city-ekb";
  const tyumen = "city-tyumen";

  const rows: Row[] = [
    { id: "lenina", city: ekb, parent: null, type: "street", name: "Ленина", names: ["Lenina"], point: null, enable: true },
    { id: "malysheva", city: ekb, parent: null, type: "street", name: "Малышева", names: [], point: null, enable: true },
    { id: "lenina-12", city: ekb, parent: "lenina", type: "house", name: "12", names: [], point: { lat: 56.83, lng: 60.6 }, enable: true },
    { id: "lenina-14", city: ekb, parent: "lenina", type: "house", name: "14", names: [], point: { lat: 56.84, lng: 60.6 }, enable: true },
    { id: "lenina-12-p3", city: ekb, parent: "lenina-12", type: "entrance", name: "подъезд 3", names: [], point: null, enable: true },
    { id: "hotel", city: ekb, parent: null, type: "place", name: "гост. Прибалтийская", names: ["Baltic hotel"], point: { lat: 56.8, lng: 60.5 }, enable: true },
    { id: "closed", city: ekb, parent: null, type: "street", name: "Ленинградская", names: [], point: null, enable: false },
    { id: "respubliki", city: tyumen, parent: null, type: "street", name: "Республики", names: [], point: null, enable: true },
  ];

  function matches(row: Row, criteria: Row): boolean {
    return Object.entries(criteria).every(([key, value]) =>
      Array.isArray(value) ? value.includes(row[key]) : (row[key] ?? null) === (value ?? null),
    );
  }

  before(function () {
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
      const found = await AddressModel.search({ city: ekb, query: "лени" });
      expect(found.map((node: Row) => node.id)).to.deep.equal(["lenina"]);
    });

    it("finds a node by an alias as readily as by its name", async function () {
      const found = await AddressModel.search({ city: ekb, query: "baltic" });
      expect(found.map((node: Row) => node.id)).to.deep.equal(["hotel"]);
    });

    it("keeps one city's catalog out of another's", async function () {
      const found = await AddressModel.search({ city: tyumen, query: "лени" });
      expect(found).to.deep.equal([]);
    });

    it("skips a disabled node", async function () {
      const found = await AddressModel.search({ city: ekb, query: "ленинградская" });
      expect(found).to.deep.equal([]);
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
  });

  describe("what a node is allowed to be", function () {
    function create(values: Row): Promise<string | undefined> {
      return new Promise((resolve) => AddressModel.beforeCreate(values, resolve));
    }

    it("refuses a house with no parent: nothing would ever find it", async function () {
      const error = await create({ city: ekb, type: "house", name: "12" });
      expect(error).to.match(/parent is required/);
    });

    it("refuses a point that is not a point", async function () {
      const error = await create({ city: ekb, parent: "lenina", type: "house", name: "12", point: { lat: 200, lng: 0 } });
      expect(error).to.match(/valid latitude and longitude/);
    });

    it("refuses a parent from another city", async function () {
      const error = await create({ city: tyumen, parent: "lenina", type: "house", name: "12" });
      expect(error).to.match(/another city/);
    });

    it("accepts a house under a street of the same city", async function () {
      const error = await create({ city: ekb, parent: "lenina", type: "house", name: "16", point: { lat: 56.85, lng: 60.6 } });
      expect(error).to.equal(undefined);
    });
  });
});
