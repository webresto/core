import { expect } from "chai";
import { toId } from "../../lib/association-id";
import { toPublic } from "../../lib/auth-provider";
import { between } from "../../lib/maintenance";
import { validateRule } from "../../lib/notification-rules";
import { generateOtp } from "../../lib/one-time-password";
import { assertCoordinate } from "../../lib/place";
import { normalizePromotionCodeValue } from "../../lib/promotion-code";
import { isInDeclaredSettings, setDeclaredSetting } from "../../lib/settings/declared";
import { syncToEnv } from "../../lib/settings/env-mirror";
import { cleanValue, parseBoolean } from "../../lib/settings/value";

/** The pure parts of the models, which live in `lib/` so a model is attributes, hooks and methods. */
describe("Helpers taken out of models", function () {
  it("toId reads an id off a bare value and off a populated association", function () {
    expect(toId(" place-1 ")).to.equal("place-1");
    expect(toId({ id: "place-1" })).to.equal("place-1");
    expect(toId({})).to.equal(null);
  });

  it("toPublic keeps only what a storefront may see", function () {
    const row = { adapter: "google", title: "Google", config: { secret: "x" } } as any;
    expect(toPublic(row)).to.include({ adapter: "google", title: "Google" }).and.not.have.property("config");
  });

  it("between treats an empty bound as open", function () {
    expect(between(0, 0, 5)).to.equal(true);
    expect(between(10, 20, 5)).to.equal(false);
  });

  it("validateRule wants a snake_case key and an event", function () {
    expect(validateRule({ key: "Order-Ready" })).to.have.members([
      "key must be snake_case (lowercase, digits, underscores)",
      "eventKey is required",
    ]);
  });

  it("generateOtp gives six digits", function () {
    const saved = { DEMO_MODE: process.env.DEMO_MODE, DEFAULT_OTP: process.env.DEFAULT_OTP };
    delete process.env.DEMO_MODE;
    delete process.env.DEFAULT_OTP;
    try {
      expect(generateOtp()).to.match(/^\d{6}$/);
    } finally {
      for (const [key, value] of Object.entries(saved)) {
        if (value === undefined) delete process.env[key];
        else process.env[key] = value;
      }
    }
  });

  it("assertCoordinate refuses a point off the globe", function () {
    expect(() => assertCoordinate({ lat: 56.8, lon: 60.6 })).to.not.throw();
    expect(() => assertCoordinate({ lat: 95, lon: 60.6 })).to.throw("valid latitude and longitude");
  });

  it("normalizePromotionCodeValue compares codes trimmed and upper-cased", function () {
    expect(normalizePromotionCodeValue(" sale10 ")).to.equal("SALE10");
    expect(normalizePromotionCodeValue("  ")).to.equal(null);
  });

  it("a declared setting is known after it is declared", function () {
    expect(isInDeclaredSettings("MODEL_HELPERS_TEST")).to.equal(false);
    setDeclaredSetting("MODEL_HELPERS_TEST");
    expect(isInDeclaredSettings("MODEL_HELPERS_TEST")).to.equal(true);
  });

  it("parseBoolean reads the usual spellings", function () {
    expect(parseBoolean("Yes")).to.equal(true);
    expect(parseBoolean("0")).to.equal(false);
    expect(parseBoolean("")).to.equal(undefined);
  });

  it("cleanValue reads a lost value as no value", function () {
    expect(cleanValue("undefined")).to.equal(undefined);
    expect(cleanValue("value")).to.equal("value");
  });

  it("syncToEnv mirrors JWT_SECRET into the environment", function () {
    const saved = process.env.JWT_SECRET;
    try {
      syncToEnv({ key: "JWT_SECRET", type: "string", value: "from-db" } as any);
      expect(process.env.JWT_SECRET).to.equal("from-db");
    } finally {
      if (saved === undefined) delete process.env.JWT_SECRET;
      else process.env.JWT_SECRET = saved;
    }
  });
});
