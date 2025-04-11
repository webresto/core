import { expect } from 'chai';
import { ProductModifier } from '../../../libs/ProductModifier';
import { GroupModifier, OrderModifier } from '../../../interfaces/Modifier';

describe("ProductModifier.fillDefault", () => {
  const productModifiers: GroupModifier[] = [
    {
      id: "group1",
      minAmount: 1,
      maxAmount: 3,
      rmsId: "rms-group1",
      modifierId: "modifier-group1",
      childModifiers: [
        {
          id: "mod1",
          defaultAmount: 1,
          rmsId: "r1",
          modifierId: "mod-1"
        },
        {
          id: "mod2",
          rmsId: "r2",
          modifierId: "mod-2"
        }
      ]
    },
    {
      id: "group2",
      rmsId: "rms-group2",
      modifierId: "modifier-group2",
      childModifiers: [
        {
          id: "mod3",
          defaultAmount: 2,
          rmsId: "r3",
          modifierId: "mod-3"
        }
      ]
    }
  ];

  it("should add missing default modifiers", () => {
    const orderModifiers: OrderModifier[] = [
      { id: "mod2", groupId: "group1", amount: 1, rmsId: "r2" }
    ];

    const productMod = new ProductModifier(productModifiers);
    const result = productMod.fillDefault(orderModifiers);

    expect(result).to.have.deep.include({
      id: "mod1",
      groupId: "group1",
      amount: 1,
      rmsId: "r1"
    });

    expect(result).to.have.deep.include({
      id: "mod3",
      groupId: "group2",
      amount: 2,
      rmsId: "r3"
    });

    expect(result).to.have.deep.include({
      id: "mod2",
      groupId: "group1",
      amount: 1,
      rmsId: "r2"
    });

    expect(result).to.have.lengthOf(3);
  });

  it("should not add default modifiers if they already exist", () => {
    const orderModifiers: OrderModifier[] = [
      { id: "mod1", groupId: "group1", amount: 1, rmsId: "r1" },
      { id: "mod3", groupId: "group2", amount: 2, rmsId: "r3" }
    ];

    const productMod = new ProductModifier(productModifiers);
    const result = productMod.fillDefault(orderModifiers);

    expect(result).to.deep.equal(orderModifiers);
    expect(result).to.have.lengthOf(2);
  });
});
