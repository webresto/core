import { expect } from "chai";
import { AddressImportNode, importAddresses, validateAddressNodes } from "../../lib/address-import";

/**
 * The address catalog out of a file, against an in-memory model.
 *
 * Two things matter and neither is a query: that a node is created after the one
 * it hangs from whatever order the file lists them in, and that a file with a
 * mistake in it writes nothing at all.
 */
describe("Address import", function () {
  const city = "city-ekb";
  const realAddress = (global as any).Address;

  let rows: any[] = [];

  beforeEach(function () {
    rows = [];
    (global as any).Address = {
      create: (values: any) => ({
        fetch: async () => {
          const row = { id: `row-${rows.length + 1}`, ...values };
          rows.push(row);
          return row;
        },
      }),
    };
  });

  afterEach(function () {
    (global as any).Address = realAddress;
    rows = [];
  });

  const lenina: AddressImportNode = { key: "lenina", type: "street", name: "Ленина", names: ["ул. Ленина"] };
  const house12: AddressImportNode = {
    key: "lenina-12", parent: "lenina", type: "house", name: "12", point: { lat: 56.83, lng: 60.6 },
  };

  it("creates a parent before the child that names it, whatever the file's order", async function () {
    const result = await importAddresses({ city, nodes: [house12, lenina] });

    expect(result).to.deep.equal({ created: 2, errors: [] });
    expect(rows.map((row) => row.name)).to.deep.equal(["Ленина", "12"]);
    expect(rows[1].parent).to.equal(rows[0].id);
    expect(rows[0].parent).to.equal(null);
  });

  it("carries the city, the aliases and the point onto every node", async function () {
    await importAddresses({ city, nodes: [lenina, house12] });

    expect(rows[0]).to.include({ city, type: "street", name: "Ленина" });
    expect(rows[0].names).to.deep.equal(["ул. Ленина"]);
    expect(rows[1].point).to.deep.equal({ lat: 56.83, lng: 60.6 });
    expect(rows[0].point).to.equal(null);
  });

  it("goes three deep", async function () {
    const entrance: AddressImportNode = { parent: "lenina-12", type: "entrance", name: "подъезд 3" };
    await importAddresses({ city, nodes: [entrance, house12, lenina] });

    expect(rows.map((row) => row.name)).to.deep.equal(["Ленина", "12", "подъезд 3"]);
    expect(rows[2].parent).to.equal(rows[1].id);
  });

  it("refuses a parity it does not know, and writes nothing", async function () {
    const result = await importAddresses({
      city,
      nodes: [lenina, { parent: "lenina", type: "range", name: "1–99", lo: 1, hi: 99, parity: "odd " as never }],
    });

    expect(result.created).to.equal(0);
    expect(result.errors[0]).to.contain("unknown parity");
    expect(rows).to.deep.equal([]);
  });

  it("carries the bounds of a range through", async function () {
    await importAddresses({
      city,
      nodes: [lenina, { parent: "lenina", type: "range", name: "1–99, нечётные", lo: 1, hi: 99, parity: "odd" }],
    });

    expect(rows[1]).to.include({ type: "range", lo: 1, hi: 99, parity: "odd" });
  });

  it("refuses a parent the file does not define", async function () {
    const result = await importAddresses({ city, nodes: [{ parent: "nowhere", type: "house", name: "12" }] });

    expect(result.created).to.equal(0);
    expect(result.errors[0]).to.contain("does not define");
  });

  it("refuses two nodes with the same key", function () {
    const errors = validateAddressNodes([lenina, { ...lenina, name: "Ленина 2" }]);

    expect(errors[0]).to.contain('Key "lenina"');
  });

  it("refuses an unknown type", function () {
    expect(validateAddressNodes([{ type: "planet", name: "Земля" }])[0]).to.contain("unknown type");
  });

  it("refuses nodes that name each other in a circle", async function () {
    const result = await importAddresses({
      city,
      nodes: [
        { key: "a", parent: "b", type: "street", name: "А" },
        { key: "b", parent: "a", type: "street", name: "Б" },
      ],
    });

    expect(result.created).to.equal(0);
    expect(result.errors[0]).to.contain("circle");
    expect(rows).to.deep.equal([]);
  });

  it("refuses a file with no node list", function () {
    expect(validateAddressNodes(undefined)[0]).to.contain('"nodes"');
    expect(validateAddressNodes([])[0]).to.contain("no nodes");
  });
});
