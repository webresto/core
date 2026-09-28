import { expect } from "chai";
import { isBalanceValue, isEmptyRow, limitsNothing, mergeValues } from "../../lib/dish-place/row";
import {
  getEffectiveBalance,
  normalizeBalanceMode,
  DISH_PLACE_BALANCE_MODES,
} from "../../lib/menu/dish-place-balance";

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

describe("DishPlace row", function () {
  it("takes null and anything from -1 up as a balance", function () {
    expect([null, -1, 0, 5].every(isBalanceValue)).to.equal(true);
    expect(isBalanceValue(-2)).to.equal(false);
  });

  it("reads -1, null and a missing value as no limit", function () {
    expect([-1, null, undefined].every(limitsNothing)).to.equal(true);
    expect(limitsNothing(0)).to.equal(false);
  });

  it("calls an enabled row without limits empty", function () {
    expect(isEmptyRow({ localBalance: -1, rmsBalance: null })).to.equal(true);
    expect(isEmptyRow({ localBalance: -1, rmsBalance: null, enable: false })).to.equal(false);
  });

  it("keeps the stored value of a source the update leaves out", function () {
    expect(mergeValues({ localBalance: 0, enable: true }, { rmsBalance: -1 })).to.deep.equal({
      localBalance: 0,
      rmsBalance: -1,
      enable: true,
    });
  });
});
