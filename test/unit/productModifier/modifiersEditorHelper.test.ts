import { expect } from 'chai';
import {
  normalizeModifiers,
  serializeModifiers,
  validateModifiers,
  summarizeModifiers,
} from '../../../libs/adminpanel/controls/modifiersEditorHelper';

describe('modifiersEditorHelper', () => {
  const valid = [
    {
      id: 'grp-sauce',
      rmsId: 'iiko-grp-sauce',
      minAmount: 1,
      maxAmount: 1,
      required: true,
      childModifiers: [
        { id: 'd-ketchup', rmsId: 'iiko-ketchup', defaultAmount: 1 },
        { id: 'd-mustard', rmsId: 'iiko-mustard' },
      ],
    },
  ];

  it('normalizes and serializes back to a clean GroupModifier[]', () => {
    const normalized = normalizeModifiers(valid);
    const serialized = serializeModifiers(normalized);
    expect(serialized).to.have.length(1);
    expect(serialized[0].id).to.equal('grp-sauce');
    expect(serialized[0].childModifiers).to.have.length(2);
    expect(serialized[0].childModifiers[0].id).to.equal('d-ketchup');
  });

  it('reports no issues for a valid value', () => {
    expect(validateModifiers(normalizeModifiers(valid))).to.deep.equal([]);
  });

  it('flags a group without a category and without options', () => {
    const issues = validateModifiers(normalizeModifiers([{ id: '', childModifiers: [] }]));
    const messages = issues.map((i) => i.message);
    expect(messages).to.include('Group is not linked to a category');
    expect(messages).to.include('Group has no modifier options');
  });

  it('flags min greater than max', () => {
    const issues = validateModifiers(
      normalizeModifiers([{ id: 'g', minAmount: 5, maxAmount: 2, childModifiers: [{ id: 'd' }] }]),
    );
    expect(issues.some((i) => i.message === 'Min amount is greater than max amount')).to.equal(true);
  });

  it('preserves unknown/legacy keys through a normalize → serialize round-trip', () => {
    const input = [{ id: 'g', rmsId: 'r', legacyLeftover: 'keep-me', childModifiers: [{ id: 'd', extraChildKey: 1 }] }];
    const out = serializeModifiers(normalizeModifiers(input)) as any[];
    expect(out[0].legacyLeftover).to.equal('keep-me');
    expect(out[0].childModifiers[0].extraChildKey).to.equal(1);
  });

  it('maps deprecated freeAmount → freeOfChargeAmount on normalize', () => {
    const out = serializeModifiers(normalizeModifiers([{ id: 'g', freeAmount: 2, childModifiers: [{ id: 'd' }] }])) as any[];
    expect(out[0].freeOfChargeAmount).to.equal(2);
    expect(out[0].freeAmount).to.equal(undefined);
  });

  it('summarizes groups/options counts', () => {
    expect(summarizeModifiers([])).to.equal('Нет модификаторов');
    expect(summarizeModifiers(valid)).to.contain('1 гр.');
    expect(summarizeModifiers(valid)).to.contain('2 опц.');
  });
});
