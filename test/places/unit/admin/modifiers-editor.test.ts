import { expect } from "chai";
import {
  normalizeModifiers,
  serializeModifiers,
  summarizeModifiers,
  validateModifiers,
} from "../../../../lib/adminpanel/controls/modifiersEditorHelper";

/** The admin's modifier editor: a product's groups in, the same groups out, and what it warns about. */
describe("Modifiers editor", function () {
  const valid = [
    {
      id: "group-1",
      rmsId: "rms-group-1",
      minAmount: 1,
      maxAmount: 1,
      required: true,
      childModifiers: [
        { id: "modifier-1", rmsId: "rms-modifier-1", defaultAmount: 1 },
        { id: "modifier-2", rmsId: "rms-modifier-2" },
      ],
    },
  ];

  it("reads a value and writes it back as clean groups", function () {
    const serialized = serializeModifiers(normalizeModifiers(valid));
    expect(serialized).to.have.length(1);
    expect(serialized[0].id).to.equal("group-1");
    expect(serialized[0].childModifiers.map((modifier: any) => modifier.id)).to.deep.equal(["modifier-1", "modifier-2"]);
  });

  it("keeps keys it does not know through the round trip", function () {
    const input = [{ id: "group-1", rmsId: "rms-group-1", extraKey: "keep", childModifiers: [{ id: "modifier-1", extraChildKey: 1 }] }];
    const out = serializeModifiers(normalizeModifiers(input)) as any[];
    expect(out[0].extraKey).to.equal("keep");
    expect(out[0].childModifiers[0].extraChildKey).to.equal(1);
  });

  it("warns about a group with no category, no options, or a minimum above its maximum", function () {
    expect(validateModifiers(normalizeModifiers(valid))).to.deep.equal([]);

    const empty = validateModifiers(normalizeModifiers([{ id: "", childModifiers: [] }])).map((issue) => issue.message);
    expect(empty).to.include.members(["Group is not linked to a category", "Group has no modifier options"]);

    const inverted = validateModifiers(normalizeModifiers([{ id: "group-1", minAmount: 5, maxAmount: 2, childModifiers: [{ id: "modifier-1" }] }]));
    expect(inverted.map((issue) => issue.message)).to.include("Min amount is greater than max amount");
  });

  it("summarizes groups and options for the list column", function () {
    expect(summarizeModifiers([])).to.equal("Нет модификаторов");
    expect(summarizeModifiers(valid)).to.contain("1 гр.").and.contain("2 опц.");
  });
});
