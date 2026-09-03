import { expect } from "chai";
import {
  getEffectiveBalance,
  normalizeBalanceMode,
  DISH_PLACE_BALANCE_MODES,
} from "../../lib/dish-place-balance";

describe("DishPlace effective balance", function () {
  it("treats a product with no row as unlimited in every mode", function () {
    for (const mode of DISH_PLACE_BALANCE_MODES) {
      expect(getEffectiveBalance({ localBalance: null, rmsBalance: null, mode })).to.equal(-1);
      expect(getEffectiveBalance({ localBalance: undefined, rmsBalance: undefined, mode })).to.equal(-1);
    }
  });

  it("lets a disabled place stop the product in every mode", function () {
    for (const mode of DISH_PLACE_BALANCE_MODES) {
      expect(getEffectiveBalance({ localBalance: -1, rmsBalance: 8, enable: false, mode })).to.equal(0);
    }
  });

  it("uses only the selected source", function () {
    expect(getEffectiveBalance({ localBalance: 3, rmsBalance: 8, mode: "local-only" })).to.equal(3);
    expect(getEffectiveBalance({ localBalance: 3, rmsBalance: 8, mode: "rms-only" })).to.equal(8);
  });

  it("falls back to unlimited when the selected source said nothing", function () {
    expect(getEffectiveBalance({ localBalance: null, rmsBalance: 8, mode: "local-only" })).to.equal(-1);
    expect(getEffectiveBalance({ localBalance: 3, rmsBalance: null, mode: "rms-only" })).to.equal(-1);
  });

  it("takes the smallest real limit in minimum mode", function () {
    expect(getEffectiveBalance({ localBalance: 3, rmsBalance: 8, mode: "minimum" })).to.equal(3);
    expect(getEffectiveBalance({ localBalance: -1, rmsBalance: 2, mode: "minimum" })).to.equal(2);
    expect(getEffectiveBalance({ localBalance: -1, rmsBalance: -1, mode: "minimum" })).to.equal(-1);
    expect(getEffectiveBalance({ localBalance: null, rmsBalance: 0, mode: "minimum" })).to.equal(0);
  });

  it("keeps a zero from either source as a stop in minimum mode", function () {
    expect(getEffectiveBalance({ localBalance: 0, rmsBalance: 8, mode: "minimum" })).to.equal(0);
    expect(getEffectiveBalance({ localBalance: 8, rmsBalance: 0, mode: "minimum" })).to.equal(0);
  });

  it("falls back to the safe mode for unknown or removed values", function () {
    expect(normalizeBalanceMode("legacy-global")).to.equal("minimum");
    expect(normalizeBalanceMode(undefined)).to.equal("minimum");
    expect(normalizeBalanceMode("rms-only")).to.equal("rms-only");
  });
});
