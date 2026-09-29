import { expect } from "chai";
import { ProductModifier } from "../../../../lib/ProductModifier";
import { GroupModifier, OrderModifier } from "../../../../interfaces/Modifier";

/**
 * A product's modifier groups against what a basket line chose: filling in the
 * defaults, topping a required group up to its minimum, and refusing a choice
 * outside a group's bounds.
 */
describe("ProductModifier", function () {
  const option = (id: string, extra: Record<string, unknown> = {}) => ({ id, rmsId: `rms-${id}`, ...extra });
  const chosen = (id: string, groupId: string, amount: number): OrderModifier => ({ id, groupId, amount, rmsId: `rms-${id}` });

  describe("fillDefault", function () {
    const groups: GroupModifier[] = [
      { id: "group-1", rmsId: "rms-group-1", minAmount: 1, maxAmount: 3, childModifiers: [option("modifier-1", { defaultAmount: 1 }), option("modifier-2")] },
      { id: "group-2", rmsId: "rms-group-2", childModifiers: [option("modifier-3", { defaultAmount: 2 })] },
    ];

    it("adds every default the line does not have yet, and keeps what it chose", function () {
      const result = new ProductModifier(groups).fillDefault([chosen("modifier-2", "group-1", 1)]);

      expect(result).to.have.deep.members([
        chosen("modifier-2", "group-1", 1),
        chosen("modifier-1", "group-1", 1),
        chosen("modifier-3", "group-2", 2),
      ]);
    });

    it("adds nothing when the defaults are there already", function () {
      const line = [chosen("modifier-1", "group-1", 1), chosen("modifier-3", "group-2", 2)];
      expect(new ProductModifier(groups).fillDefault(line)).to.deep.equal(line);
    });
  });

  describe("ensureMinDefaults", function () {
    const groups: GroupModifier[] = [
      { id: "group-1", rmsId: "rms-group-1", minAmount: 1, maxAmount: 3, childModifiers: [option("modifier-1", { defaultAmount: 1 }), option("modifier-2")] },
      // No option has a default amount.
      { id: "group-2", rmsId: "rms-group-2", minAmount: 1, childModifiers: [option("modifier-3", { defaultAmount: 0 }), option("modifier-4")] },
      { id: "group-3", rmsId: "rms-group-3", minAmount: 0, childModifiers: [option("modifier-5", { defaultAmount: 1 })] },
      { id: "group-4", rmsId: "rms-group-4", childModifiers: [option("modifier-6", { defaultAmount: 1 })] },
    ];

    it("tops a required group up to its minimum: the option with a default first, else the first option", function () {
      const result = new ProductModifier(groups).ensureMinDefaults([]);

      expect(result).to.have.length(2);
      expect(result[0]).to.deep.include(chosen("modifier-1", "group-1", 1));
      expect(result[1]).to.deep.include(chosen("modifier-3", "group-2", 1));
    });

    it("leaves a group alone whose minimum is zero or not set", function () {
      const result = new ProductModifier(groups).ensureMinDefaults([]);
      expect(result.map((modifier) => modifier.groupId)).to.not.include.members(["group-3", "group-4"]);
    });
  });

  describe("validate", function () {
    const group: GroupModifier = {
      id: "group-1", rmsId: "rms-group-1", minAmount: 1, maxAmount: 2,
      childModifiers: [option("modifier-1"), option("modifier-2")],
    };
    const validate = (line: OrderModifier[]) => () => new ProductModifier([group]).validate(line);

    it("takes one or two options of a group that allows one to two", function () {
      expect(validate([chosen("modifier-1", "group-1", 1)])).not.to.throw();
      expect(validate([chosen("modifier-1", "group-1", 1), chosen("modifier-2", "group-1", 1)])).not.to.throw();
    });

    it("refuses fewer than the minimum and more than the maximum", function () {
      expect(validate([])).to.throw(/minimum/i);
      expect(validate([chosen("modifier-1", "group-1", 2), chosen("modifier-2", "group-1", 1)])).to.throw(/maximum/i);
    });

    it("does not count an option the group does not have", function () {
      expect(validate([chosen("modifier-9", "group-1", 10)])).to.throw(/minimum/i);
    });
  });
});
