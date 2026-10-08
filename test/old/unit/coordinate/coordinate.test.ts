import { expect } from 'chai';
import { toCoordinatePair, toAddressCoordinate } from '../../../lib/coordinate';

describe("coordinate.toCoordinatePair", () => {
  it("converts string lon/lat to numbers", () => {
    const r = toCoordinatePair({ lon: '37.6', lat: '55.7' });
    expect(r).to.deep.equal({ lon: 37.6, lat: 55.7 });
  });

  it("passes through numeric lon/lat", () => {
    const r = toCoordinatePair({ lon: 37.6, lat: 55.7 });
    expect(r).to.deep.equal({ lon: 37.6, lat: 55.7 });
  });

  it("returns null for null/undefined input", () => {
    expect(toCoordinatePair(null)).to.equal(null);
    expect(toCoordinatePair(undefined)).to.equal(null);
  });

  it("returns null for non-numeric strings", () => {
    expect(toCoordinatePair({ lon: 'abc', lat: '55.7' })).to.equal(null);
    expect(toCoordinatePair({ lon: '37.6', lat: '' })).to.equal(null);
  });

  it("returns null for NaN/Infinity values", () => {
    expect(toCoordinatePair({ lon: NaN, lat: 55.7 })).to.equal(null);
    expect(toCoordinatePair({ lon: 37.6, lat: Infinity })).to.equal(null);
  });
});

describe("coordinate.toAddressCoordinate", () => {
  it("converts numeric pair to string pair", () => {
    const r = toAddressCoordinate({ lon: 37.6, lat: 55.7 });
    expect(r).to.deep.equal({ lon: '37.6', lat: '55.7' });
  });

  it("returns undefined for null input", () => {
    expect(toAddressCoordinate(null)).to.equal(undefined);
  });
});
