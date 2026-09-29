import { expect } from 'chai';
import {
  normalizeTags,
  serializeTags,
  validateTags,
  summarizeTags,
  canonicalTagName,
} from '../../../libs/adminpanel/controls/tagsEditorHelper';

describe('tagsEditorHelper', () => {
  it('normalizes the canonical DishTag[] shape', () => {
    const out = normalizeTags([{ name: 'vegetarian' }, { name: ' spicy ' }]);
    expect(out).to.have.length(2);
    expect(out[0].name).to.equal('vegetarian');
    expect(out[1].name).to.equal('spicy');
  });

  it('normalizes plain string arrays (iiko v1 shape)', () => {
    const out = normalizeTags(['vegetarian', ' spicy ']);
    expect(out.map((tag) => tag.name)).to.deep.equal(['vegetarian', 'spicy']);
  });

  it('normalizes a JSON string value', () => {
    const out = normalizeTags('[{"name":"fish"},"chicken"]');
    expect(out.map((tag) => tag.name)).to.deep.equal(['fish', 'chicken']);
  });

  it('treats a non-JSON string as a comma-separated list', () => {
    const out = normalizeTags('sweet, sour');
    expect(out.map((tag) => tag.name)).to.deep.equal(['sweet', 'sour']);
  });

  it('returns [] for null / undefined / empty / garbage input', () => {
    expect(normalizeTags(null)).to.deep.equal([]);
    expect(normalizeTags(undefined)).to.deep.equal([]);
    expect(normalizeTags('')).to.deep.equal([]);
    expect(normalizeTags(42)).to.deep.equal([]);
    expect(normalizeTags([null, '', {}])).to.deep.equal([]);
  });

  it('preserves unknown keys through a normalize → serialize round-trip (iiko v2 allergens)', () => {
    const input = [{ id: 'alg-1', code: 'GLU', name: 'gluten' }];
    const out = serializeTags(normalizeTags(input)) as any[];
    expect(out[0]).to.deep.equal({ id: 'alg-1', code: 'GLU', name: 'gluten' });
  });

  it('serializes to the canonical DishTag[] shape', () => {
    const out = serializeTags(normalizeTags(['vegetarian']));
    expect(out).to.deep.equal([{ name: 'vegetarian' }]);
  });

  it('flags duplicate tags case-insensitively', () => {
    const issues = validateTags(normalizeTags(['Spicy', 'spicy ']));
    expect(issues).to.have.length(1);
    expect(issues[0].message).to.equal('Duplicate tag');
    expect(issues[0].index).to.equal(1);
  });

  it('flags a tag without a name (kept because of extra keys)', () => {
    const issues = validateTags(normalizeTags([{ id: 'alg-1' }]));
    expect(issues).to.have.length(1);
    expect(issues[0].message).to.equal('Tag name is empty');
  });

  it('reports no issues for a valid value', () => {
    expect(validateTags(normalizeTags(['fish', 'chicken']))).to.deep.equal([]);
  });

  it('summarizes for the list column', () => {
    expect(summarizeTags(null)).to.equal('—');
    expect(summarizeTags(['a', 'b'])).to.equal('a, b');
    expect(summarizeTags(['a', 'b', 'c', 'd', 'e'])).to.equal('a, b, c +2');
  });

  it('canonicalTagName trims and lowercases', () => {
    expect(canonicalTagName(' Vegetarian ')).to.equal('vegetarian');
    expect(canonicalTagName(null)).to.equal('');
  });
});
