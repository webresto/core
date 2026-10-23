import { expect } from "chai";
import { openByHours } from "../../../../lib/hours";

/**
 * Hours of a kitchen, a zone, the restaurant (`openByHours` over WorkTimeValidator of @webresto/worktime, patched in
 * `.ci/patchset`): open from the minute it opens, closed from the minute it closes; none - always open.
 */
describe("Hours", function () {
  const DAYS = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  const TEN_TO_TWENTY = [{ dayOfWeek: DAYS, start: "10:00", stop: "20:00" }];
  const at = (hours: number, minutes: number) => {
    const moment = new Date();
    moment.setHours(hours, minutes, 0, 0);
    return moment;
  };

  it("opens at its first minute: 10:00 of 10:00-20:00 is open", function () {
    expect(openByHours(TEN_TO_TWENTY as any, at(9, 59))).to.equal(false);
    expect(openByHours(TEN_TO_TWENTY as any, at(10, 0))).to.equal(true);
    expect(openByHours(TEN_TO_TWENTY as any, at(19, 59))).to.equal(true);
  });

  it("closes at its stop: 20:00 of 10:00-20:00 is closed", function () {
    expect(openByHours(TEN_TO_TWENTY as any, at(20, 0))).to.equal(false);
  });

  it("without hours is always open", function () {
    expect(openByHours(null, at(3, 0))).to.equal(true);
    expect(openByHours([], at(3, 0))).to.equal(true);
  });
});
