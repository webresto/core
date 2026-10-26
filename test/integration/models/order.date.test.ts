import { expect } from "chai";
import { customer } from "../../mocks/customer";
import type { WorkTime } from "@webresto/worktime";
import { wallClockAt } from "../../../utils/zonedTime";

/**
 * An order to time is checked in the TZ setting, whatever timezone the process runs in.
 * The suite runs with process TZ=Etc/GMT (test/bootstrap) and the restaurant in Novosibirsk (+7).
 */
describe("Order date (order to time)", function () {
  const ZONE = "Asia/Novosibirsk";
  const ALL_DAYS = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as WorkTime["dayOfWeek"];
  let saved: { TZ: any; WORK_TIME: any; LIMIT: any };
  let dish: any;
  let n = 0;

  before(async function () {
    saved = {
      TZ: await Settings.get("TZ"),
      WORK_TIME: await Settings.get("WORK_TIME"),
      LIMIT: await Settings.get("POSSIBLE_TO_ORDER_IN_MINUTES"),
    };
    await Settings.set("TZ", { key: "TZ", value: ZONE });
    await Settings.set("WORK_TIME", {
      key: "WORK_TIME",
      value: [{ dayOfWeek: ALL_DAYS, start: "12:00", stop: "23:00", break: "00:00-00:00" }],
      jsonSchema: { type: "array" },
    });
    await Settings.set("POSSIBLE_TO_ORDER_IN_MINUTES", { key: "POSSIBLE_TO_ORDER_IN_MINUTES", value: 3 * 24 * 60 });
    dish = (await Dish.find({}))[0];
    // the restaurant zone differs from the process one - the case this suite is about
    expect(await Settings.get("TZ")).to.equal(ZONE);
    expect(process.env.TZ).to.not.equal(ZONE);
  });

  after(async function () {
    await Settings.set("TZ", { key: "TZ", value: saved.TZ ?? "" });
    await Settings.set("WORK_TIME", { key: "WORK_TIME", value: saved.WORK_TIME ?? [], jsonSchema: { type: "array" } });
    await Settings.set("POSSIBLE_TO_ORDER_IN_MINUTES", { key: "POSSIBLE_TO_ORDER_IN_MINUTES", value: saved.LIMIT ?? 0 });
  });

  async function checkAt(date: string): Promise<{ code?: number; error?: string } | null> {
    const order = await Order.create({ id: `test--order-date-${++n}` }).fetch();
    await Order.addDish({ id: order.id }, dish, 1, [], "", "user");
    await Order.updateOne({ id: order.id }, { date });
    try {
      await Order.check({ id: order.id }, customer, true, undefined, undefined);
      return null;
    } catch (e) {
      return e;
    }
  }

  const tomorrow = () => wallClockAt(new Date(Date.now() + 24 * 60 * 60 * 1000), ZONE).date;
  const DATE_CODES = [9, 10, 15, 16, 17, 18];
  const dateError = (e: { code?: number } | null) => (e && DATE_CODES.includes(e.code) ? e : null);

  it("takes an order within the worktime, the ends included", async function () {
    for (const time of ["12:00", "22:30", "23:00"]) {
      expect(dateError(await checkAt(`${tomorrow()} ${time}`)), time).to.equal(null);
    }
  });

  it("refuses an order outside the worktime of the restaurant", async function () {
    for (const time of ["11:59", "23:30", "02:00"]) {
      expect((await checkAt(`${tomorrow()} ${time}`))?.code, time).to.equal(18);
    }
  });

  it("refuses a time already past in the restaurant", async function () {
    const past = wallClockAt(new Date(Date.now() - 2 * 60 * 60 * 1000), ZONE);
    const e = await checkAt(`${past.date} ${past.time}`);
    expect([15, 18], JSON.stringify(e)).to.include(e?.code);
  });

  it("refuses an unreadable date", async function () {
    expect((await checkAt("tomorrow evening"))?.code).to.equal(9);
  });
  describe("a basket with a time already passed", function () {
    async function basketAt(date: string) {
      const order = await Order.create({ id: `test--order-date-${++n}` }).fetch();
      await Order.addDish({ id: order.id }, dish, 1, [], "", "user");
      await Order.updateOne({ id: order.id }, { date });
      return order.id;
    }

    it("drops the time on the recount, the basket becomes as soon as possible", async function () {
      const past = wallClockAt(new Date(Date.now() - 60 * 60 * 1000), ZONE);
      const id = await basketAt(`${past.date} ${past.time}`);
      const counted = await Order.countCart({ id });
      expect(counted.date ?? null).to.equal(null);
      expect((await Order.findOne({ id })).date ?? null).to.equal(null);
    });

    it("keeps a time still ahead", async function () {
      const date = `${tomorrow()} 22:30`;
      const id = await basketAt(date);
      await Order.countCart({ id });
      expect((await Order.findOne({ id })).date).to.equal(date);
    });
  });
});
