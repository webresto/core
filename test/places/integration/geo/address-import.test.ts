import { expect } from "chai";
import { AddressImportNode, importAddresses, validateAddressNodes } from "../../../../adapters/geo/default/address-import";
import { ADDRESS_TYPES } from "../../../../adapters/geo/default/defaultGeo";
import { resetDatabase } from "../../support/reset";

/**
 * The address catalog out of a file: a node is created after the one it hangs
 * from whatever order the file lists them in, and a file with a mistake in it
 * writes nothing at all.
 */
describe("Address import", function () {
  let city: string;

  beforeEach(async function () {
    await resetDatabase();
    city = (await City.create({ name: "City 1" }).fetch()).id;
  });

  const street1: AddressImportNode = { key: "street-1", type: "street", name: "Street 1", names: ["Alias 1"] };
  const house12: AddressImportNode = {
    key: "house-12", parent: "street-1", type: "house", name: "12", point: { lat: 56.83, lon: 60.6 },
  };

  const rows = async () => {
    const all = await Address.find({ city });
    const byId = new Map(all.map((row: any) => [row.id, row]));
    // Parents first, the way the import has to create them.
    const depth = (row: any): number => (row.parent ? 1 + depth(byId.get(row.parent)) : 0);
    return all.sort((a: any, b: any) => depth(a) - depth(b));
  };

  it("creates a parent before the child that names it, whatever the file's order", async function () {
    expect(await importAddresses({ city, nodes: [house12, street1] })).to.deep.equal({ created: 2, deleted: 0, errors: [] });

    const [street, house] = await rows();
    expect(street).to.include({ name: "Street 1", parent: null });
    expect(house).to.include({ name: "12", parent: street.id });
  });

  it("with replace, deletes what the city had: loading the same file twice leaves one catalog", async function () {
    await importAddresses({ city, nodes: [street1, house12] });

    expect(await importAddresses({ city, nodes: [street1, house12], replace: true })).to.deep.equal({ created: 2, deleted: 2, errors: [] });
    expect(await rows()).to.have.length(2);
  });

  it("without replace, adds to what the city has and deletes nothing", async function () {
    await importAddresses({ city, nodes: [street1] });

    const result = await importAddresses({ city, nodes: [{ type: "street", name: "Street 2" }] });

    expect(result).to.deep.equal({ created: 1, deleted: 0, errors: [] });
    expect(await rows()).to.have.length(2);
  });

  it("deletes only the city it loads", async function () {
    const other = (await City.create({ name: "City 2" }).fetch()).id;
    await importAddresses({ city: other, nodes: [street1] });

    await importAddresses({ city, nodes: [house12, street1], replace: true });

    expect(await Address.find({ city: other })).to.have.length(1);
  });

  it("carries the city, the aliases and the point onto every node", async function () {
    await importAddresses({ city, nodes: [street1, house12] });

    const [street, house] = await rows();
    expect(street).to.include({ city, type: "street" });
    expect(street.names).to.deep.equal(["Alias 1"]);
    expect(street.point).to.equal(null);
    expect(house.point).to.deep.equal({ lat: 56.83, lon: 60.6 });
  });

  it("goes three deep", async function () {
    const entrance: AddressImportNode = { parent: "house-12", type: "entrance", name: "entrance 3" };
    await importAddresses({ city, nodes: [entrance, house12, street1] });

    const [, house, row] = await rows();
    expect(row).to.include({ name: "entrance 3", parent: house.id });
  });

  it("carries a block's bounds through, and nothing but lo..hi", async function () {
    const block = { parent: "street-1", type: "range", name: "1–99", lo: 1, hi: 99, parity: "odd" } as AddressImportNode;
    await importAddresses({ city, nodes: [street1, block] });

    const [, row] = await rows();
    expect(row).to.include({ type: "range", lo: 1, hi: 99 });
    expect(row).to.not.have.property("parity");
  });

  describe("what geocoders found stays", function () {
    const mark = (street: string) => ({ source: "test", street });
    const ourStreet = async (name: string) => await Address.findOne({ city, type: "street", name, cache: null });
    /** A house a geocoder found under `parent`, at `point`. */
    const cachedHouse = async (parent: string, name: string, point: { lat: number; lon: number }, street = "Street 1") =>
      await Address.create({ city, parent, type: "house", name, point, cache: mark(street) }).fetch();

    it("a replace deletes ours only and hangs a cached house under the file's street of its name", async function () {
      await importAddresses({ city, nodes: [street1, house12] });
      const house14 = await cachedHouse((await ourStreet("Street 1")).id, "14", { lat: 56.84, lon: 60.6 });

      expect(await importAddresses({ city, nodes: [street1, house12], replace: true })).to.deep.equal({ created: 2, deleted: 2, errors: [] });

      expect(await Address.findOne({ id: house14.id })).to.deep.include({ parent: (await ourStreet("Street 1")).id, cache: mark("Street 1") });
    });

    it("a replace drops a cached house the file has now: its number under the street, or a place closer than 10 m", async function () {
      await importAddresses({ city, nodes: [street1] });
      const street = (await ourStreet("Street 1")).id;
      const house14 = await cachedHouse(street, "14", { lat: 56.84, lon: 60.6 });
      const house15 = await cachedHouse(street, "15", { lat: 56.85, lon: 60.6 });

      await importAddresses({
        city,
        replace: true,
        nodes: [
          street1,
          { parent: "street-1", type: "house", name: "14", point: { lat: 56.841, lon: 60.6 } },
          { parent: "street-1", type: "house", name: "15a", point: { lat: 56.85004, lon: 60.6 } },
        ],
      });

      expect(await Address.findOne({ id: house14.id })).to.equal(undefined);
      expect(await Address.findOne({ id: house15.id })).to.equal(undefined);
      expect((await rows()).map((row: any) => row.name).sort()).to.deep.equal(["14", "15a", "Street 1"]);
    });

    it("a cached house whose street the file has not hangs under a cached street of that name", async function () {
      await importAddresses({ city, nodes: [{ type: "street", name: "Street 9" }] });
      const house3 = await cachedHouse((await ourStreet("Street 9")).id, "3", { lat: 56.86, lon: 60.6 }, "Street 9");

      await importAddresses({ city, nodes: [street1], replace: true });

      const street = await Address.findOne({ id: (await Address.findOne({ id: house3.id })).parent });
      expect(street).to.deep.include({ type: "street", name: "Street 9", parent: null, cache: mark("Street 9") });
    });

    it("a load without replace brings our street for a cached one: its houses move under ours, the cached street goes", async function () {
      const cachedStreet = await Address.create({ city, type: "street", name: "Street 8", cache: mark("Street 8") }).fetch();
      const house2 = await cachedHouse(cachedStreet.id, "2", { lat: 56.87, lon: 60.6 }, "Street 8");

      await importAddresses({ city, nodes: [{ type: "street", name: "Street 8 " }] });

      expect((await Address.findOne({ id: house2.id })).parent).to.equal((await ourStreet("Street 8")).id);
      expect(await Address.findOne({ id: cachedStreet.id })).to.equal(undefined);
    });
  });

  describe("a file with a mistake writes nothing", function () {
    it("a parent the file does not define", async function () {
      const result = await importAddresses({ city, nodes: [street1, { parent: "nowhere", type: "house", name: "12" }] });

      expect(result.created).to.equal(0);
      expect(result.errors[0]).to.contain("does not define");
      expect(await rows()).to.deep.equal([]);
    });

    it("the catalog the city had stays", async function () {
      await importAddresses({ city, nodes: [street1] });

      const result = await importAddresses({ city, nodes: [{ parent: "nowhere", type: "house", name: "12" }], replace: true });

      expect(result.deleted).to.equal(0);
      expect(await rows()).to.have.length(1);
    });

    it("nodes that name each other in a circle", async function () {
      const result = await importAddresses({
        city,
        nodes: [
          { key: "a", parent: "b", type: "street", name: "Street 1" },
          { key: "b", parent: "a", type: "street", name: "Street 2" },
        ],
      });

      expect(result.created).to.equal(0);
      expect(result.errors[0]).to.contain("circle");
      expect(await rows()).to.deep.equal([]);
    });

    it("two nodes with the same key, an unknown type, no node list", function () {
      expect(validateAddressNodes([street1, { ...street1, name: "Street 2" }], ADDRESS_TYPES)[0]).to.contain('Key "street-1"');
      expect(validateAddressNodes([{ type: "planet", name: "Planet 1" }], ADDRESS_TYPES)[0]).to.contain("unknown type");
      expect(validateAddressNodes(undefined, ADDRESS_TYPES)[0]).to.contain('"nodes"');
      expect(validateAddressNodes([], ADDRESS_TYPES)[0]).to.contain("no nodes");
    });
  });
});
