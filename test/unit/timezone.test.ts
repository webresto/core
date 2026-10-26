/**
 *   npx mocha -r ts-node/register/transpile-only test/unit/timezone.test.ts --exit
 */
import { expect } from "chai";
import { TIMEZONE_ALIASES, isTimezoneSupported, normalizeTimezone } from "../../libs/timezone";

const tzEnum: string[] = require("../../settings/tz.json").jsonSchema.enum;

describe("timezone helpers", () => {
  it("every value offered by the TZ setting is known to the worktime resolver", () => {
    expect(tzEnum.filter((zone) => !isTimezoneSupported(zone))).to.deep.equal([]);
  });

  it("every alias points to a resolvable zone from the TZ list", () => {
    for (const [alias, zone] of Object.entries(TIMEZONE_ALIASES)) {
      expect(isTimezoneSupported(zone), `${alias} -> ${zone}`).to.equal(true);
      expect(tzEnum, `${alias} -> ${zone}`).to.include(zone);
    }
  });

  it("legacy names reported by browsers are rewritten, current ones kept", () => {
    expect(isTimezoneSupported("Asia/Saigon")).to.equal(false);
    expect(normalizeTimezone("Asia/Saigon")).to.equal("Asia/Ho_Chi_Minh");
    expect(normalizeTimezone("Asia/Calcutta")).to.equal("Asia/Kolkata");
    expect(normalizeTimezone("Europe/Kyiv")).to.equal("Europe/Kiev");
    expect(normalizeTimezone(" Europe/Moscow ")).to.equal("Europe/Moscow");
    expect(normalizeTimezone(undefined)).to.equal(undefined);
  });

  it("empty and garbage values are not supported", () => {
    expect(isTimezoneSupported("")).to.equal(false);
    expect(isTimezoneSupported("undefined")).to.equal(false);
    expect(isTimezoneSupported(undefined)).to.equal(false);
  });
});
