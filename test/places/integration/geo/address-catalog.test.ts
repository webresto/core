import { expect } from "chai";
import { formatAddressPath } from "../../../../lib/address/format";
import { nominatim } from "../../support/nominatim";
import { resetDatabase } from "../../support/reset";
import { thrown } from "../../support/storefront";

/**
 * The address catalog: what the storefront's address input offers as the
 * customer types, the path a chosen node reads as, the line an order saves,
 * where a node stands, and what the catalog refuses to hold.
 *
 *   City 1: Street 1 (alias "Alias 1") with houses 12 and 14, entrance 3 in 12;
 *           Street 2 with blocks 1–99 and 100–200 and house 145;
 *           Street 3 with houses 10, 2a, 1, 2, none of them on the map;
 *           Place 1 (alias "Hotel 1") with Unit 7; Place 2 eight levels deep;
 *           District 1 with its own Street 1, and an empty District 2.
 *   City 2: Street 4.
 *   City 3: nothing but Tent 42, straight under the city.
 */
describe("Address catalog", function () {
  const n: Record<string, any> = {};
  let city1: string;
  let city2: string;
  let city3: string;

  before(async function () {
    await resetDatabase();
    city1 = (await City.create({ name: "City 1" }).fetch()).id;
    city2 = (await City.create({ name: "City 2" }).fetch()).id;
    city3 = (await City.create({ name: "City 3" }).fetch()).id;

    const node = async (key: string, values: Record<string, unknown>) => {
      n[key] = await Address.create({ city: city1, ...values }).fetch();
    };

    await node("street1", { type: "street", name: "Street 1", names: ["Alias 1"] });
    await node("house12", { parent: n.street1.id, type: "house", name: "12", point: { lat: 56.83, lon: 60.6 } });
    await node("house14", { parent: n.street1.id, type: "house", name: "14", point: { lat: 56.84, lon: 60.6 } });
    await node("entrance3", { parent: n.house12.id, type: "entrance", name: "entrance 3" });

    await node("street2", { type: "street", name: "Street 2" });
    await node("block1", { parent: n.street2.id, type: "range", name: "1–99", lo: 1, hi: 99, point: { lat: 56.836, lon: 60.614 } });
    await node("house145", { parent: n.street2.id, type: "house", name: "145", point: { lat: 56.8421, lon: 60.664 } });
    await node("block2", { parent: n.street2.id, type: "range", name: "100–200", lo: 100, hi: 200 });

    // Created out of order: the order of suggestions is what is tested.
    await node("street3", { type: "street", name: "Street 3" });
    for (const name of ["10", "2a", "1", "2"]) await node(`street3-${name}`, { parent: n.street3.id, type: "house", name });
    await node("street3-10-entrance2", { parent: n["street3-10"].id, type: "entrance", name: "2" });

    await node("place1", { type: "place", name: "Place 1", names: ["Hotel 1"], point: { lat: 56.8, lon: 60.5 } });
    await node("unit7", { parent: n.place1.id, type: "unit", name: "Unit 7" });

    await node("deep0", { type: "place", name: "Place 2" });
    for (let at = 1; at < 8; at++) await node(`deep${at}`, { parent: n[`deep${at - 1}`].id, type: "unit", name: `Unit ${at}` });

    await node("district1", { type: "district", name: "District 1" });
    await node("district1-street1", { parent: n.district1.id, type: "street", name: "Street 1" });
    await node("district2", { type: "district", name: "District 2" });

    n.street4 = await Address.create({ city: city2, type: "street", name: "Street 4" }).fetch();
    n.tent42 = await Address.create({ city: city3, type: "unit", name: "Tent 42", point: { lat: 57.1, lon: 60.1 } }).fetch();
  });

  const geo = async () => Adapter.get("geo");
  const names = (found: any[]) => found.map((node) => node.name);
  const ids = (found: any[]) => found.map((node) => node.id);

  describe("search", function () {
    it("does not offer a house number typed with nothing chosen yet", async function () {
      expect(await Address.search({ city: city1, query: "12" })).to.deep.equal([]);
    });

    it("offers the houses of a street once the street is chosen", async function () {
      expect(ids(await Address.search({ city: city1, parent: n.street1.id, query: "12" }))).to.deep.equal([n.house12.id]);
    });

    it("finds a node by part of its name, whatever the case", async function () {
      expect(names(await Address.search({ city: city1, query: "STREET 2" }))).to.deep.equal(["Street 2"]);
    });

    it("finds a node by an alias as readily as by its name", async function () {
      expect(ids(await Address.search({ city: city1, query: "hotel" }))).to.deep.equal([n.place1.id]);
    });

    it("keeps one city's catalog out of another's", async function () {
      expect(await Address.search({ city: city2, query: "street 1" })).to.deep.equal([]);
    });

    it("finds a street that stands under a district, and both Street 1 at once", async function () {
      expect(ids(await Address.search({ city: city1, query: "street 1" })))
        .to.have.members([n.street1.id, n["district1-street1"].id]);
    });

    it("finds what the city holds directly, whatever its type", async function () {
      // A tent is a `unit`, not a root type, but nothing stands above it.
      expect(names(await Address.search({ city: city3, query: "42" }))).to.deep.equal(["Tent 42"]);
    });

    it("still keeps a house under a street out of the root", async function () {
      expect(await Address.search({ city: city1, query: "14" })).to.deep.equal([]);
    });

    it("reads house numbers the way a person does", async function () {
      expect(names(await Address.search({ city: city1, parent: n.street3.id, query: "" }))).to.deep.equal(["1", "2", "2a", "10"]);
    });
  });

  describe("blocks of house numbers", function () {
    const under = (query: string) => Address.search({ city: city1, parent: n.street2.id, query });

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
  });

  describe("path", function () {
    const line = async (key: string) => formatAddressPath((await Address.path(n[key].id)).map((node: any) => node.name));

    it("reads from the city down to the node, as deep as the graph goes", async function () {
      expect(await line("house12")).to.equal("Street 1, 12");
      expect(await line("entrance3")).to.equal("Street 1, 12, entrance 3");
    });

    it("is one node for a root", async function () {
      expect(ids(await Address.path(n.street1.id))).to.deep.equal([n.street1.id]);
    });

    it("does not stop at the number of types there are", async function () {
      expect(await Address.path(n.deep7.id)).to.have.length(8);
    });
  });

  describe("as the storefront reads it", function () {
    it("names what is above each suggestion", async function () {
      const found = await (await geo()).search({ city: city1, query: "street 1" });
      const byId = new Map(found.map((node) => [node.id, node]));
      expect(byId.get(n.street1.id)!.ancestors).to.deep.equal([]);
      expect(byId.get(n["district1-street1"].id)!.ancestors).to.deep.equal(["District 1"]);
      expect(byId.get(n["district1-street1"].id)!.parent).to.equal(n.district1.id);
    });

    it("gives every step of a path the names above it", async function () {
      const path = await (await geo()).path(n.entrance3.id);
      expect(path.map((node) => node.ancestors)).to.deep.equal([[], ["Street 1"], ["Street 1", "12"]]);
    });
  });

  describe("the line an order saves", function () {
    it("rebuilds it from the chosen node, and does not ask for a number a house already has", async function () {
      expect(await (await geo()).describe({ node: n.house12.id, formatted: "whatever the client sent" } as any))
        .to.deep.equal({ formatted: "Street 1, 12", selfAddressed: true });
    });

    it("adds the typed number to a street and still asks for one", async function () {
      expect(await (await geo()).describe({ node: n.street1.id, home: "5", formatted: "" } as any))
        .to.deep.equal({ formatted: "Street 1, 5", selfAddressed: false });
    });

    it("keeps free text as typed", async function () {
      expect(await (await geo()).describe({ node: null, formatted: "Street 9, 5" } as any))
        .to.deep.equal({ formatted: "Street 9, 5", selfAddressed: false });
    });
  });

  describe("where a node stands", function () {
    it("stands a node with no point of its own where its parent stands", async function () {
      const where = await (await geo()).locate({ node: n.unit7.id, home: null } as any);
      expect(where.coordinate).to.deep.equal({ lat: 56.8, lon: 60.5 });
      expect(where.diagnostics.join(" ")).to.contain('address-node (place "Place 1")');
    });

    it("prefers the node's own point to the one above it", async function () {
      const where = await (await geo()).locate({ node: n.house12.id } as any);
      expect(where.coordinate).to.deep.equal({ lat: 56.83, lon: 60.6 });
      expect(where.diagnostics.join(" ")).to.contain('address-node (house "12")');
    });

    it("stands a block at its own middle", async function () {
      const where = await (await geo()).locate({ node: n.block1.id, home: "45a" } as any);
      expect(where.coordinate).to.deep.equal({ lat: 56.836, lon: 60.614 });
    });

    it("geocodes an entrance by the house it is in, not by its own name", async function () {
      nominatim.requests = [];
      await (await geo()).locate({ node: n["street3-10-entrance2"].id } as any);
      expect(nominatim.requests.map((request) => request.query.q)).to.deep.equal(["Street 3, 10"]);
    });
  });

  describe("what the catalog refuses", function () {
    const create = (values: Record<string, unknown>) => thrown(Address.create({ city: city1, ...values }).fetch());

    it("a point that is not a point", async function () {
      expect(String(await create({ parent: n.street1.id, type: "house", name: "16", point: { lat: 200, lon: 0 } })))
        .to.match(/valid latitude and longitude/);
    });

    it("a parent from another city", async function () {
      expect(String(await thrown(Address.create({ city: city2, parent: n.street1.id, type: "house", name: "16" }).fetch())))
        .to.match(/another city/);
    });

    it("bounds on anything that is not a block", async function () {
      expect(String(await create({ parent: n.street1.id, type: "house", name: "16", lo: 1, hi: 99 })))
        .to.match(/those make a range/);
    });

    it("a second Street 1 under the same district, but not under another one", async function () {
      expect(String(await create({ parent: n.district1.id, type: "street", name: "Street 1" }))).to.match(/already exists here/);
      expect(await create({ parent: n.district2.id, type: "street", name: "Street 1" })).to.equal(null);
    });

    it("a type the default geo adapter does not declare, on create and on an update that writes one", async function () {
      expect(String(await create({ type: "pier", name: "Pier 1" }))).to.match(/Address type "pier" is unknown/);
      expect(String(await thrown(Address.update({ id: n.street4.id }, { type: "pier" }).fetch()))).to.match(/unknown/);
      expect(await thrown(Address.update({ id: n.street4.id }, { name: "Street 4" }).fetch())).to.equal(null);
    });

    it("and takes a house under a street of the same city", async function () {
      expect(await create({ parent: n.street1.id, type: "house", name: "16", point: { lat: 56.85, lon: 60.6 } })).to.equal(null);
    });
  });
});
