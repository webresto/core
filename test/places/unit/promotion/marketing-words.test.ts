import { expect } from "chai";
import { discountSummary } from "../../../../lib/marketing/promotions";
import { dayWords, discountWords, giftWords, periodWords, reasonWords, scheduleWords } from "../../../../lib/marketing/words";
import { PROMOCODE_MIN_BASKET_TOTAL, PROMOCODE_PROMOTION_DISABLED, PROMOCODE_SERVICE_TYPE } from "../../../../lib/promotion-code";

/**
 * The words of marketing (plan C18): the term of a code, its hours, what a promotion gives, and why a code gave
 * nothing. The phone has no front end to build them in, and the web had one of its own - two readers of one record
 * would have drifted apart. English phrases here; a translator of the asked language is passed in by the caller.
 */
describe("Marketing in words", function () {
  const money = (amount: number) => `${amount} ₽`;

  describe("the term of a code", function () {
    it("both days, one of them, or none", function () {
      expect(periodWords({ startDate: "2026-10-22", stopDate: "2026-10-31" })).to.equal("from 22.10.2026 to 31.10.2026");
      expect(periodWords({ startDate: "2026-10-22" })).to.equal("from 22.10.2026");
      expect(periodWords({ stopDate: "2026-10-31" })).to.equal("until 31.10.2026");
      expect(periodWords({ startDate: "", stopDate: null })).to.equal("no time limit");
    });

    it("a day is read as the admin wrote it, and anything else is kept as it is", function () {
      expect(dayWords("2026-01-05")).to.equal("05.01.2026");
      expect(dayWords("tomorrow")).to.equal("tomorrow");
    });

    it("goes through the translator of the answer", function () {
      const t = (phrase: string) => (phrase === "from %s to %s" ? "с %s по %s" : phrase === "no time limit" ? "без ограничения" : phrase);
      expect(periodWords({ startDate: "2026-10-22", stopDate: "2026-10-31" }, { t })).to.equal("с 22.10.2026 по 31.10.2026");
      expect(periodWords({}, { t })).to.equal("без ограничения");
    });
  });

  describe("hours", function () {
    const hours = (dayOfWeek: string[]) => ({ dayOfWeek, start: "10:00", stop: "22:00" }) as any;

    it("no hours is around the clock - which is what core reads them as", function () {
      expect(scheduleWords(null)).to.equal("around the clock");
      expect(scheduleWords([])).to.equal("around the clock");
    });

    it("runs of days are a range, the rest a list", function () {
      expect(scheduleWords(hours(["monday", "tuesday", "wednesday", "thursday", "friday"]))).to.equal("Mon-Fri 10:00-22:00");
      expect(scheduleWords(hours(["monday", "wednesday", "friday"]))).to.equal("Mon, Wed, Fri 10:00-22:00");
      expect(scheduleWords(hours(["saturday", "sunday"]))).to.equal("Sat, Sun 10:00-22:00");
    });

    it("every day of the week is every day, and a break is said", function () {
      expect(scheduleWords(hours(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]))).to.equal("every day 10:00-22:00");
      expect(scheduleWords({ ...hours(["monday"]), break: "14:00-15:00" })).to.equal("Mon 10:00-22:00 (break 14:00-15:00)");
    });

    it("several rules, through a semicolon", function () {
      expect(scheduleWords([hours(["monday"]), { dayOfWeek: ["sunday"], start: "12:00", stop: "18:00" } as any]))
        .to.equal("Mon 10:00-22:00; Sun 12:00-18:00");
    });
  });

  describe("what a promotion gives", function () {
    it("a percentage and a flat amount, by what they are off", function () {
      expect(discountWords(discountSummary({ discountType: "percentage", discountAmount: 10 } as any))).to.equal("−10% off the whole basket");
      expect(discountWords(discountSummary({ discountType: "flat", discountAmount: 150 } as any), { money })).to.equal("−150 ₽ off the whole basket");
      expect(discountWords(discountSummary({ discountType: "percentage", discountAmount: 10, dishes: ["d1", "d2"] } as any)))
        .to.equal("−10% off the chosen products");
      expect(discountWords(discountSummary({ discountType: "percentage", discountAmount: 10, groups: ["g1"] } as any)))
        .to.equal("−10% off the chosen groups");
      expect(discountWords(discountSummary({ discountType: "percentage", discountAmount: 10, dishes: ["d1"], groups: ["g1"] } as any)))
        .to.equal("−10% off the chosen products and groups");
    });

    it("a gift, counted in items and not in rows, with the basket it starts from", function () {
      const gift = discountSummary({ gift: { minBasketTotal: 1449, dishes: [{ dishId: "d1", amount: 2 }, { dishId: "d2", amount: 1 }] } } as any);
      expect(gift).to.include({ giftDishesCount: 2, giftItemsCount: 3 });
      expect(giftWords(gift, { money })).to.equal("Gift: 3 item(s) from 1449 ₽");
      expect(discountWords(gift, { money })).to.equal("Gift: 3 item(s) from 1449 ₽");

      const two = discountSummary({ gift: { minBasketTotal: 1449, dishes: [{ dishId: "d1", amount: 2 }] } } as any);
      expect(giftWords(two, { money })).to.equal("Gift: 2 item(s) from 1449 ₽");
    });

    it("a discount and a gift together, and nothing when the config gives nothing", function () {
      const both = discountSummary({ discountType: "percentage", discountAmount: 5, gift: { minBasketTotal: 0, dishes: [{ dishId: "d1", amount: 1 }] } } as any);
      expect(discountWords(both)).to.equal("−5% off the whole basket, Gift: 1 item(s)");
      expect(discountWords(discountSummary({ discountType: "percentage", discountAmount: 0 } as any))).to.equal("nothing");
      expect(discountWords(discountSummary(null))).to.equal("nothing");
    });
  });

  describe("why a code gave nothing", function () {
    it("reads the entry core wrote into the order", function () {
      expect(reasonWords({ type: PROMOCODE_MIN_BASKET_TOTAL, state: { minBasketTotal: 1449 } }, { money })).to.equal("the basket is below 1449 ₽");
      expect(reasonWords({ type: PROMOCODE_SERVICE_TYPE, state: { serviceTypes: ["delivery", "pickup"] } })).to.equal("only for Delivery, Pickup");
      expect(reasonWords({ type: PROMOCODE_PROMOTION_DISABLED, state: {} })).to.equal("the promotion is switched off");
      expect(reasonWords({ type: "something-else" })).to.equal("");
      expect(reasonWords(null)).to.equal("");
    });
  });
});
