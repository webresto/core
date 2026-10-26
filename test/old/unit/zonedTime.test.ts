import { expect } from "chai";
import {
  isOpenAt,
  orderDateToInstant,
  parseWallClock,
  timezoneOffsetString,
  wallClockAt,
  workRanges,
} from "../../utils/zonedTime";

const ALL_DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const worktime = (start: string, stop: string, extra: object = {}) =>
  [{ dayOfWeek: ALL_DAYS, start, stop, ...extra }] as any;

// Whatever timezone the process runs in, the answers are the same: everything is in the zone passed
describe("zonedTime", function () {
  it("reads the wall-clock time in the zone, not in the process one", function () {
    // 2026-10-25 19:30 UTC = 22:30 in Moscow (+3), 02:30 of the next day in Novosibirsk (+7)
    const at = new Date("2026-10-25T19:30:00Z");
    expect(wallClockAt(at, "Europe/Moscow")).to.deep.equal({ date: "2026-10-25", time: "22:30", minutes: 1350, weekday: "sunday" });
    expect(wallClockAt(at, "Asia/Novosibirsk")).to.include({ date: "2026-10-26", time: "02:30", weekday: "monday" });
    expect(wallClockAt(new Date("2026-10-25T21:00:00Z"), "Europe/Moscow").time).to.equal("00:00");
  });

  it("turns order.date into the instant in the zone", function () {
    expect(orderDateToInstant("2026-10-25 22:30", "Europe/Moscow").toISOString()).to.equal("2026-10-25T19:30:00.000Z");
    expect(orderDateToInstant("2026-10-25T22:30:15", "Asia/Novosibirsk").toISOString()).to.equal("2026-10-25T15:30:00.000Z");
    // explicit offset is kept as is
    expect(orderDateToInstant("2026-10-25T22:30:00+03:00", "Asia/Novosibirsk").toISOString()).to.equal("2026-10-25T19:30:00.000Z");
    expect(isNaN(orderDateToInstant("tomorrow", "Europe/Moscow").getTime())).to.equal(true);
  });

  it("knows daylight saving time", function () {
    expect(timezoneOffsetString(new Date("2026-07-01T12:00:00Z"), "Europe/Berlin")).to.equal("+02:00");
    expect(timezoneOffsetString(new Date("2026-12-01T12:00:00Z"), "Europe/Berlin")).to.equal("+01:00");
    expect(orderDateToInstant("2026-07-01 12:00", "Europe/Berlin").toISOString()).to.equal("2026-07-01T10:00:00.000Z");
    expect(orderDateToInstant("2026-12-01 12:00", "Europe/Berlin").toISOString()).to.equal("2026-12-01T11:00:00.000Z");
    expect(timezoneOffsetString(new Date("2026-07-01T12:00:00Z"), "Asia/Kolkata")).to.equal("+05:30");
  });

  it("parses only YYYY-MM-DD HH:mm[:ss]", function () {
    expect(parseWallClock("2026-10-25 09:05")).to.include({ date: "2026-10-25", minutes: 545 });
    expect(parseWallClock("2026-10-25 24:00")).to.equal(null);
    expect(parseWallClock("2026-10-25T09:05:00Z")).to.equal(null);
    expect(parseWallClock(undefined)).to.equal(null);
  });

  it("an order to time takes both ends of the worktime, now does not take the closing minute", function () {
    const wt = worktime("12:00", "23:00");
    const at = (time: string) => parseWallClock(`2026-10-25 ${time}`);
    expect(isOpenAt(wt, at("12:00"), { inclusive: true })).to.equal(true);
    expect(isOpenAt(wt, at("22:30"), { inclusive: true })).to.equal(true);
    expect(isOpenAt(wt, at("23:00"), { inclusive: true })).to.equal(true);
    expect(isOpenAt(wt, at("23:01"), { inclusive: true })).to.equal(false);
    expect(isOpenAt(wt, at("11:59"), { inclusive: true })).to.equal(false);
    expect(isOpenAt(wt, at("12:00"))).to.equal(true);
    expect(isOpenAt(wt, at("23:00"))).to.equal(false);
  });

  it("takes the weekday of the date", function () {
    const wt = [
      { dayOfWeek: ["saturday", "sunday"], start: "12:00", stop: "23:00" },
      { dayOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday"], start: "09:00", stop: "18:00" },
    ] as any;
    expect(isOpenAt(wt, parseWallClock("2026-10-25 20:00"), { inclusive: true })).to.equal(true); // sunday
    expect(isOpenAt(wt, parseWallClock("2026-10-26 20:00"), { inclusive: true })).to.equal(false); // monday
    expect(isOpenAt([{ dayOfWeek: ["monday"], start: "09:00", stop: "18:00" }] as any, parseWallClock("2026-10-25 10:00"))).to.equal(false);
  });

  it("a day past midnight opens the next morning, the break is cut out", function () {
    const night = worktime("18:00", "02:00");
    expect(workRanges(night, "2026-10-25")).to.deep.equal([[0, 120], [1080, 1440]]);
    expect(isOpenAt(night, parseWallClock("2026-10-25 01:30"), { inclusive: true })).to.equal(true);
    expect(isOpenAt(night, parseWallClock("2026-10-25 03:00"), { inclusive: true })).to.equal(false);
    expect(isOpenAt(worktime("10:00", "00:00"), parseWallClock("2026-10-25 23:59"))).to.equal(true);

    const lunch = worktime("10:00", "22:00", { break: "15:00-16:00" });
    expect(isOpenAt(lunch, parseWallClock("2026-10-25 15:30"), { inclusive: true })).to.equal(false);
    expect(isOpenAt(lunch, parseWallClock("2026-10-25 16:00"), { inclusive: true })).to.equal(true);
    expect(isOpenAt(worktime("10:00", "22:00", { break: "00:00-00:00" }), parseWallClock("2026-10-25 12:00"))).to.equal(true);
  });

  it("no worktime is always open", function () {
    expect(isOpenAt([], parseWallClock("2026-10-25 03:00"))).to.equal(true);
    expect(isOpenAt(null, parseWallClock("2026-10-25 03:00"))).to.equal(true);
  });
});
