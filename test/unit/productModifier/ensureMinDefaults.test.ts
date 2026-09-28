import { expect } from 'chai';
import { ProductModifier } from '../../../lib/ProductModifier';
import { GroupModifier, OrderModifier } from '../../../interfaces/Modifier';

describe("ProductModifier.ensureMinDefaults", () => {
  const productModifiers: GroupModifier[] = [
    {
      id: "group1",
      minAmount: 1,
      maxAmount: 3,
      rmsId: "rms-group1",
      childModifiers: [
        {
          id: "mod1",
          defaultAmount: 1,
          rmsId: "r1",
        },
        {
          id: "mod2",
          rmsId: "r2",
        }
      ]
    },
    {
      id: "group2",
      minAmount: 1,
      rmsId: "rms-group2",
      childModifiers: [
        {
          id: "mod3",
          defaultAmount: 0, // no defaultAmount
          rmsId: "r3",
        },
        {
          id: "mod4", // this one can be picked
          rmsId: "r4",
        }
      ]
    },
    {
      id: "group3", // group with minAmount = 0
      minAmount: 0,
      rmsId: "rms-group3",
      childModifiers: [
        {
          id: "mod5",
          defaultAmount: 1,
          rmsId: "r5",
        }
      ]
    },
    {
      id: "group4", // group without minAmount
      rmsId: "rms-group4",
      childModifiers: [
        {
          id: "mod6",
          defaultAmount: 1,
          rmsId: "r6",
        }
      ]
    }
  ];

  it("should set first modifier to minAmount if no defaultAmount exists", () => {
    const orderModifiers: OrderModifier[] = []; // empty

    const productMod = new ProductModifier(productModifiers);
    const result = productMod.ensureMinDefaults(orderModifiers);

    // group1: minAmount = 1 → modifier mod1 (the one with defaultAmount) must be picked
    expect(result[0]).to.deep.include({
      id: "mod1", // the first modifier
      groupId: "group1",
      amount: 1, // up to minAmount
      rmsId: "r1"
    });

    // group2: minAmount = 1, no defaultAmount → mod4 (first in the list) must be picked
    expect(result[1]).to.deep.include({
      id: "mod3",
      groupId: "group2",
      amount: 1, // up to minAmount
      rmsId: "r3"
    });

    expect(result).to.have.lengthOf(2); // two modifiers expected
  });

  it("should add defaultAmount modifiers if available", () => {
    const orderModifiers: OrderModifier[] = []; // empty

    const productMod = new ProductModifier(productModifiers);
    const result = productMod.ensureMinDefaults(orderModifiers);

    // group1: minAmount = 1 → mod1 (the one with defaultAmount) must be picked
    expect(result[0]).to.deep.include({
      id: "mod1",
      groupId: "group1",
      amount: 1,
      rmsId: "r1"
    });

    expect(result).to.have.lengthOf(2); // two modifiers expected
  });

  it("should do nothing if minAmount is 0 or does not exist", () => {
    const orderModifiers: OrderModifier[] = []; // empty

    const productMod = new ProductModifier(productModifiers);
    const result = productMod.ensureMinDefaults(orderModifiers);

    // group3 (minAmount = 0): nothing must be added
    const group3Modifier = result.find(mod => mod.groupId === "group3");
    expect(group3Modifier).to.be.undefined; // no modifier must be added for group3

    // group4 (no minAmount): nothing must be added
    const group4Modifier = result.find(mod => mod.groupId === "group4");
    expect(group4Modifier).to.be.undefined; // no modifier must be added for group4

    // modifiers for the other groups are added anyway
    expect(result).to.have.lengthOf(2); // only 2 modifiers must be added
  });
});
