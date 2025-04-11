import { expect } from 'chai';
import { ProductModifier } from '../../../libs/ProductModifier';
import { GroupModifier, Modifier, OrderModifier } from '../../../interfaces/Modifier';

describe('ProductModifier', () => {
  const childModifiers: Modifier[] = [
    { id: 'm1', rmsId: 'mod1', modifierId: 'mod1' },
    { id: 'm2', rmsId: 'mod2', modifierId: 'mod2' },
  ];

  const group: GroupModifier = {
    id: 'g1',
    rmsId: 'grp1',
    modifierId: '',
    childModifiers,
    minAmount: 1,
    maxAmount: 2,
  };

  it('is valid when one modifier is selected', () => {
    const order: OrderModifier[] = [{ id: 'm1', rmsId: 'mod1', groupId: 'g1', amount: 1 }];
    const validator = new ProductModifier([group]);
    expect(() => validator.validate(order)).not.to.throw();
  });

  it('is valid when two modifiers are selected', () => {
    const order: OrderModifier[] = [
      { id: 'm1', rmsId: 'mod1', groupId: 'g1', amount: 1 },
      { id: 'm2', rmsId: 'mod2', groupId: 'g1', amount: 1 },
    ];
    const validator = new ProductModifier([group]);
    expect(() => validator.validate(order)).not.to.throw();
  });

  it('is invalid when no modifiers are selected', () => {
    const order: OrderModifier[] = [];
    const validator = new ProductModifier([group]);
    expect(() => validator.validate(order)).to.throw(/minimum/i);
  });

  it('is invalid when maxAmount is exceeded', () => {
    const order: OrderModifier[] = [
      { id: 'm1', rmsId: 'mod1', groupId: 'g1', amount: 2 },
      { id: 'm2', rmsId: 'mod2', groupId: 'g1', amount: 1 },
    ];
    const validator = new ProductModifier([group]);
    expect(() => validator.validate(order)).to.throw(/maximum/i);
  });

  it('ignores modifiers not in this group', () => {
    const order: OrderModifier[] = [
      { id: 'not-in-group', rmsId: 'other', groupId: 'g1', amount: 10 },
    ];
    const validator = new ProductModifier([group]);
    expect(() => validator.validate(order)).to.throw(/minimum/i);
  });
});
