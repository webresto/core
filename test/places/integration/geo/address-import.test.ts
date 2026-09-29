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
    expect(await importAddresses({ city, nodes: [house12, street1] })).to.deep.equal({ created: 2, errors: [] });

    const [street, house] = await rows();
    expect(street).to.include({ name: "Street 1", parent: null });
    expect(house).to.include({ name: "12", parent: street.id });
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

  describe("a file with a mistake writes nothing", function () {
    it("a parent the file does not define", async function () {
      const result = await importAddresses({ city, nodes: [street1, { parent: "nowhere", type: "house", name: "12" }] });

      expect(result.created).to.equal(0);
      expect(result.errors[0]).to.contain("does not define");
      expect(await rows()).to.deep.equal([]);
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
