import { expect } from "chai";
// @ts-ignore - a front-end module of the admin panel, plain JavaScript
import * as model from "../../../../lib/adminpanel/src/components/variants/variantsModel";

/**
 * The draft of the "Variants" control of the dish form: what "Generate" builds, what a
 * regeneration keeps of the rows there were, and the value the field `Dish.variants` gets.
 */
describe("admin: the variants control", function () {
  const size = { key: "size", name: "Size", values: [{ value: 20, title: "20 cm" }, { value: 30, title: "30 cm" }] };
  const crust = { key: "crust", name: "Crust", values: [{ value: 0, title: "No crust" }, { value: 1, title: "Cheese" }] };
  const row = (values: Record<string, unknown>, more: Record<string, unknown> = {}) => ({ values, rel: null, isDefault: false, price: null, keep: true, ...more });

  it("reads the value of the field; what is not a box is an empty draft", function () {
    const read = model.normalizeVariants({ options: [size], mappings: [{ values: { size: 20 }, rel: "variant-1", isDefault: true }, { values: { size: 30 }, price: 700 }] });

    expect(read.options).to.deep.equal([size]);
    expect(read.rows).to.deep.equal([row({ size: 20 }, { rel: "variant-1", isDefault: true }), row({ size: 30 }, { price: 700 })]);
    for (const empty of [null, undefined, "", []]) expect(model.normalizeVariants(empty)).to.deep.equal({ options: [], rows: [] });
  });

  it("builds every combination, in the order of the attributes and of their values", function () {
    expect(model.regenerate([size, crust], []).map((made: any) => made.values)).to.deep.equal([
      { size: 20, crust: 0 }, { size: 20, crust: 1 }, { size: 30, crust: 0 }, { size: 30, crust: 1 },
    ]);
    expect(model.regenerate([], [row({ size: 20 })])).to.deep.equal([]);
  });

  it("a new attribute moves a variant to its first value and makes requests of the rest", function () {
    const rows = [row({ size: 20 }, { rel: "variant-1", isDefault: true }), row({ size: 30 }, { rel: "variant-2" })];

    expect(model.regenerate([size, crust], rows)).to.deep.equal([
      row({ size: 20, crust: 0 }, { rel: "variant-1", isDefault: true }),
      row({ size: 20, crust: 1 }),
      row({ size: 30, crust: 0 }, { rel: "variant-2" }),
      row({ size: 30, crust: 1 }),
    ]);
  });

  it("a removed value takes its rows with it; a removed attribute leaves the first row of each combination", function () {
    const rows = [
      row({ size: 20, crust: 0 }, { rel: "variant-1" }),
      row({ size: 20, crust: 1 }, { rel: "variant-2" }),
      row({ size: 30, crust: 0 }, { rel: "variant-3" }),
    ];
    const small = { ...size, values: [size.values[0]] };

    expect(model.regenerate([small, crust], rows).map((kept: any) => kept.rel)).to.deep.equal(["variant-1", "variant-2"]);
    expect(model.regenerate([size], rows).map((kept: any) => kept.rel)).to.deep.equal(["variant-1", "variant-3"]);
  });

  it("keeps an unticked row unticked and a typed price typed", function () {
    const rows = [row({ size: 20 }, { price: 400 }), row({ size: 30 }, { keep: false })];
    const large = { ...size, values: [...size.values, { value: 35, title: "35 cm" }] };

    expect(model.regenerate([large], rows)).to.deep.equal([row({ size: 20 }, { price: 400 }), row({ size: 30 }, { keep: false }), row({ size: 35 })]);
  });

  it("writes an existing variant by its id and a new one as a request with its price", function () {
    const rows = [
      row({ size: 20 }, { rel: "variant-1" }),
      row({ size: 30 }, { price: 700, isDefault: true }),
      row({ size: 35 }, { price: 900, keep: false }),
    ];

    expect(model.serializeVariants([size], rows)).to.deep.equal({
      options: [size],
      mappings: [{ values: { size: 20 }, rel: "variant-1" }, { values: { size: 30 }, price: 700, isDefault: true }],
    });
  });

  it("has one default: the first kept row when none is chosen or the chosen one is unticked", function () {
    const rows = [row({ size: 20 }, { rel: "variant-1", isDefault: true, keep: false }), row({ size: 30 }, { rel: "variant-2" })];

    expect(model.serializeVariants([size], rows).mappings).to.deep.equal([{ values: { size: 30 }, rel: "variant-2", isDefault: true }]);
  });

  it("without attributes the value is empty, whatever rows are left", function () {
    expect(model.serializeVariants([], [row({ size: 20 }, { rel: "variant-1" })])).to.deep.equal({ options: [], mappings: [] });
  });

  it("names what stops the attributes and the rows", function () {
    const messages = (options: any[]) => model.optionsIssues(options).map((issue: any) => issue.message);

    expect(messages([size, crust])).to.deep.equal([]);
    expect(messages([{ key: "", name: "", values: [] }])).to.deep.equal(["An attribute needs a name", "An attribute needs a key", "An attribute needs a value"]);
    expect(messages([size, { ...crust, key: "size" }])).to.deep.equal(["Two attributes have the same key"]);
    expect(messages([{ ...size, key: "размер" }])).to.deep.equal(["A key is latin letters, digits and _"]);
    expect(messages([{ ...size, values: [{ value: 20, title: "20 cm" }, { value: 30, title: "20 CM" }, { value: 35, title: "" }] }]))
      .to.deep.equal(["A value needs a title", "Two values have the same title"]);
    expect(messages([{ ...size, values: [{ value: 20, title: "20 cm" }, { value: 20, title: "Small" }] }])).to.deep.equal(["Two values have the same value"]);

    expect(model.rowsIssues([row({ size: 20 }, { rel: "variant-1" }), row({ size: 30 }, { price: 0 })])).to.deep.equal([]);
    expect(model.rowsIssues([row({ size: 20 }, { rel: "variant-1" }), row({ size: 30 })])).to.deep.equal(["Every new variant needs a price"]);
    expect(model.rowsIssues([row({ size: 20 }, { keep: false })])).to.deep.equal(["A dish with attributes needs a variant"]);
  });

  it("reads a typed value as a number when it is one, else as the text", function () {
    expect([model.parseValue(" 30 "), model.parseValue("0"), model.parseValue("2.5"), model.parseValue("large"), model.parseValue("  ")]).to.deep.equal([30, 0, 2.5, "large", ""]);
  });

  it("a renamed value and a renamed key move the rows with them, and nothing else", function () {
    const rows = [row({ size: 20, crust: 0 }, { rel: "variant-1" }), row({ size: 30, crust: 0 }, { rel: "variant-2" })];

    expect(model.renameValue(rows, "size", 20, 25)).to.deep.equal([row({ size: 25, crust: 0 }, { rel: "variant-1" }), rows[1]]);
    expect(model.renameKey(rows, "size", "diameter").map((moved: any) => moved.values)).to.deep.equal([{ crust: 0, diameter: 20 }, { crust: 0, diameter: 30 }]);
    expect(model.renameKey(rows, "pieces", "amount")).to.deep.equal(rows);

    expect(model.renameInOptions([size, crust], { key: "size", value: 20, to: 25 })[0].values).to.deep.equal([{ value: 25, title: "20 cm" }, { value: 30, title: "30 cm" }]);
    expect(model.renameInOptions([size, crust], { key: "size", to: "diameter" }).map((option: any) => option.key)).to.deep.equal(["diameter", "crust"]);
    // The rows renamed together with their attributes stay where they were: nothing to generate.
    const renamed = model.renameInOptions([size, crust], { key: "size", value: 20, to: 25 });
    expect(model.regenerate(renamed, model.renameValue(rows, "size", 20, 25)).map((kept: any) => kept.rel)).to.deep.equal(["variant-1", null, "variant-2", null]);
  });

  it("numbers a new value after the largest one, and titles a row by its values", function () {
    expect(model.nextValue(size)).to.equal(31);
    expect(model.nextValue({ key: "pieces", name: "Pieces", values: [] })).to.equal(1);
    expect(model.rowTitle([size, crust], { crust: 1, size: 30 })).to.equal("30 cm, Cheese");
  });

  it("merges the attributes of other dishes by key: the first name, every value once", function () {
    const known = model.mergeKnownOptions([
      [size],
      [{ key: "size", name: "Diameter", values: [{ value: 30, title: "30 cm" }, { value: 35, title: "35 cm" }] }, crust],
    ]);

    expect(known).to.deep.equal([
      { key: "size", name: "Size", values: [...size.values, { value: 35, title: "35 cm" }] },
      crust,
    ]);
  });
});
