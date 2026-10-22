import { expect } from "chai";
import AuthService from "../../../../lib/AuthService";
import { resetDatabase } from "../../support/reset";
import { thrown } from "../../support/storefront";

/**
 * What a profile takes (`userUpdate` writes it as it comes): a name up to 200 characters, a date of birth
 * `YYYY-MM-DD` of a real day from 1900 to today or an empty string. Anything else is refused by the model.
 */
describe("User profile", function () {
  let user: string;

  before(async function () {
    await resetDatabase();
    user = (await AuthService.materializeUser({ firstName: "Customer", lastName: "1", phone: { code: "1", number: "5550000011", additionalNumber: "" } })).user.id;
  });

  const update = (values: Record<string, unknown>) => User.updateOne({ id: user }, values);

  it("takes a name up to 200 characters, a real date of birth and an empty one", async function () {
    expect(await update({ firstName: "N".repeat(200), birthday: "1990-05-14" })).to.include({ firstName: "N".repeat(200), birthday: "1990-05-14" });
    expect(await update({ birthday: "" })).to.include({ birthday: "" });
  });

  it("refuses a longer name, a day that does not exist, a day to come, another format, and no date as null", async function () {
    for (const values of [{ firstName: "N".repeat(201) }, { lastName: "N".repeat(201) }, { birthday: "1990-02-30" }, { birthday: "2999-01-01" }, { birthday: "14.05.1990" }, { birthday: null }]) {
      expect(await thrown(update(values)), JSON.stringify(values)).to.not.equal(null);
    }
  });
});
