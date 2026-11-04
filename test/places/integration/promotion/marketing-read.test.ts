import { expect } from "chai";
import { resetDatabase } from "../../support/reset";
import { add, newBasket } from "../../support/storefront";
import {
  getPromotionCode,
  listPromotionCodes,
  promotionCodeCounts,
  promotionCodeTaken,
  promotionCodeWords,
} from "../../../../lib/marketing/promotion-codes";
import { getPromotion, listPromotions, promotionCounts, promotionWords } from "../../../../lib/marketing/promotions";
import { applicationWords, promotionCodeApplications, promotionCodeStats } from "../../../../lib/marketing/applications";

/**
 * The read layer of the Marketing section (plan C18-C20 of `marketing.plan.md`): the selections and the answers the
 * admin panel and the mobile API share. What is asked of it here is what a screen asks: does this code act now,
 * what does it give, which promotions apply by themselves, where was the code typed and why did it give nothing.
 *
 *   Dish 1 at 10.1, Dish 2 at 15.2. LETO10 - 10% off the basket, by its own promotion ("only by code").
 *   SOON - a code that starts next year. OLD - one that ended last year. DEAD - one whose promotion is off.
 */
describe("Marketing: what the section reads", function () {
  let dish1: string;
  const day = (shift: number) => {
    const moment = new Date();
    moment.setDate(moment.getDate() + shift);
    return `${moment.getFullYear()}-${String(moment.getMonth() + 1).padStart(2, "0")}-${String(moment.getDate()).padStart(2, "0")}`;
  };

  async function promotion(id: string, values: Record<string, unknown>, discount: Record<string, unknown> = {}) {
    await Promotion.createOrUpdate({
      id, name: id, badge: "badge-1", description: `Description of ${id}`, externalId: id,
      isJoint: true, isPublic: true, createdByUser: true, concept: ["origin"],
      configDiscount: { discountType: "percentage", discountAmount: 10, dishes: [], groups: [], excludeModifiers: true, ...discount },
    } as any);
    await Promotion.update({ id }, { sortOrder: 0, ...values }).fetch();
  }

  async function code(id: string, value: string, values: Record<string, unknown>, promotions: string[]) {
    await PromotionCode.create({ id, code: value, description: `Description of ${value}`, ...values }).fetch();
    for (const linked of promotions) await PromotionCode.addToCollection(id, "promotion", linked);
  }

  beforeEach(async function () {
    await resetDatabase();
    const group = await Group.create({ name: "Group 1", enable: true }).fetch();
    dish1 = (await Dish.create({ name: "Dish 1", price: 10.1, enable: true, parentGroup: group.id }).fetch()).id;
    await Dish.create({ name: "Dish 2", price: 15.2, enable: true, parentGroup: group.id }).fetch();

    await promotion("summer", { enable: true, onlyByCode: true });
    await promotion("gift-one", { enable: true }, { discountType: "percentage", discountAmount: 0, gift: { minBasketTotal: 1449, dishes: [{ dishId: dish1, amount: 2 }] } });
    await promotion("on-its-own", { enable: true });
    await promotion("switched-off", { enable: false });

    await code("code-leto", "LETO10", {}, ["summer"]);
    await code("code-soon", "SOON", { startDate: day(30) }, ["on-its-own"]);
    await code("code-old", "OLD", { stopDate: day(-1) }, ["on-its-own"]);
    await code("code-dead", "DEAD", {}, ["switched-off"]);
  });

  describe("the codes", function () {
    it("reads the status of every one of them, and whether it acts now", async function () {
      const { items, capped } = await listPromotionCodes();
      expect(capped).to.equal(false);
      expect(items.map((item) => [item.code, item.status, item.worksNow])).to.have.deep.members([
        ["LETO10", "active", true],
        ["SOON", "scheduled", false],
        ["OLD", "expired", false],
        ["DEAD", "active", true],
      ]);
    });

    it("a code within its dates but out of its hours is active and does not act", async function () {
      const hours = { dayOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"], start: "10:00", stop: "22:00" };
      await PromotionCode.update({ id: "code-leto" }, { workTime: hours as any }).fetch();
      const nine = new Date();
      nine.setHours(9, 0, 0, 0);

      const view = await getPromotionCode("code-leto", { now: nine });
      expect(view).to.include({ status: "active", worksNow: false });
      expect(promotionCodeWords(view!).schedule).to.equal("every day 10:00-22:00");
    });

    it("is searched by its own text and by the name of a promotion it is linked to", async function () {
      expect((await listPromotionCodes({ q: "leto" })).items.map((item) => item.code)).to.deep.equal(["LETO10"]);
      expect((await listPromotionCodes({ q: "summer" })).items.map((item) => item.code)).to.deep.equal(["LETO10"]);
      expect((await listPromotionCodes({ q: "Description of SOON" })).items.map((item) => item.code)).to.deep.equal(["SOON"]);
      expect((await listPromotionCodes({ q: "nothing of the kind" })).items).to.deep.equal([]);
    });

    it("filters by status, by its switch and by whether it is linked at all", async function () {
      await PromotionCode.update({ id: "code-old" }, { enable: false }).fetch();
      await code("code-bare", "BARE", {}, []);

      expect((await listPromotionCodes({ status: "scheduled" })).items.map((item) => item.code)).to.deep.equal(["SOON"]);
      expect((await listPromotionCodes({ enable: false })).items.map((item) => item.code)).to.deep.equal(["OLD"]);
      expect((await listPromotionCodes({ binding: "without" })).items.map((item) => item.code)).to.deep.equal(["BARE"]);
      expect((await listPromotionCodes({ binding: "with" })).items.map((item) => item.code)).to.have.members(["LETO10", "SOON", "OLD", "DEAD"]);
    });

    it("says what a code gives, and says when it gives nothing", async function () {
      const money = (amount: number) => `${amount} ₽`;
      const leto = await getPromotionCode("code-leto");
      expect(promotionCodeWords(leto!, { money }).gives).to.equal("−10% off the whole basket");

      const dead = await getPromotionCode("code-dead");
      expect(dead!.givesSomething).to.equal(false);
      expect(promotionCodeWords(dead!).gives).to.equal("every promotion of the code is switched off — the code gives nothing");

      await code("code-bare", "BARE", {}, []);
      const bare = await getPromotionCode("code-bare");
      expect(promotionCodeWords(bare!).gives).to.equal("the code is linked to no promotion");
    });

    it("counts them for a summary", async function () {
      expect(await promotionCodeCounts()).to.deep.equal({ total: 4, active: 2, worksNow: 2, capped: false });
    });

    it("a code value is taken by one record only (C19)", async function () {
      expect(await promotionCodeTaken("LETO10")).to.equal(true);
      // Compared normalized, as the model saves it.
      expect(await promotionCodeTaken(" leto10 ")).to.equal(true);
      // Its own record may keep it.
      expect(await promotionCodeTaken("LETO10", "code-leto")).to.equal(false);
      expect(await promotionCodeTaken("NEW-ONE")).to.equal(false);
      expect(await promotionCodeTaken(null)).to.equal(false);
    });
  });

  describe("the promotions", function () {
    it("says where each of them stands", async function () {
      const views = await listPromotions();
      expect(views.map((view) => [view.id, view.applies])).to.have.deep.members([
        ["summer", "code-only"],
        ["gift-one", "self"],
        ["on-its-own", "self"],
        ["switched-off", "disabled"],
      ]);
    });

    it("out of its hours it would apply and does not, which is not being switched off", async function () {
      const nine = new Date();
      nine.setHours(9, 0, 0, 0);
      await Promotion.update({ id: "on-its-own" }, {
        worktime: [{ dayOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"], start: "10:00", stop: "22:00" }] as any,
      }).fetch();

      const view = await getPromotion("on-its-own", { now: nine });
      expect(view!.applies).to.equal("out-of-hours");
      expect(view).to.include({ enable: true, onlyByCode: false });
      expect(promotionWords(view!).schedule).to.equal("every day 10:00-22:00");
    });

    it("filters by where it stands and by who wrote it", async function () {
      expect((await listPromotions({ applies: "code-only" })).map((view) => view.id)).to.deep.equal(["summer"]);
      expect((await listPromotions({ applies: "off" })).map((view) => view.id)).to.deep.equal(["switched-off"]);
      expect((await listPromotions({ applies: "self" })).map((view) => view.id)).to.have.members(["gift-one", "on-its-own"]);
      expect((await listPromotions({ kind: "programmed" })).map((view) => view.id)).to.deep.equal([]);
      expect((await listPromotions({ q: "summer" })).map((view) => view.id)).to.deep.equal(["summer"]);
    });

    it("a card carries the codes it works through, and its gift in words", async function () {
      const summer = await getPromotion("summer");
      expect(summer!.promotionCode?.map((link) => link.code)).to.deep.equal(["LETO10"]);

      const gift = await getPromotion("gift-one");
      expect(promotionWords(gift!, { money: (amount) => `${amount} ₽` }).gift).to.equal("Gift: 2 item(s) from 1449 ₽");
    });

    it("counts them for a summary", async function () {
      expect(await promotionCounts()).to.deep.equal({ total: 4, self: 2, codeOnly: 1, off: 1 });
    });

    it("a deleted one is in no selection", async function () {
      await Promotion.update({ id: "on-its-own" }, { isDeleted: true }).fetch();
      expect((await listPromotions()).map((view) => view.id)).to.not.contain("on-its-own");
      expect(await getPromotion("on-its-own")).to.equal(null);
    });
  });

  describe("the applications", function () {
    async function basket(code: string | null): Promise<string> {
      const id = await newBasket();
      await add(id, dish1, 5);
      if (code) await Order.applyPromotionCode({ id }, code);
      return id;
    }

    it("tells where a code was typed, what it took off and why it gave nothing", async function () {
      await basket("LETO10");
      await basket("NOBODYS");
      await basket("DEAD");

      const { items, capped } = await promotionCodeApplications();
      expect(capped).to.equal(false);
      expect(items.map((item) => [item.code, item.status])).to.have.deep.members([
        ["LETO10", "applied"],
        ["NOBODYS", "invalid"],
        // Every promotion of it is switched off: core refuses the code at the apply (C22).
        ["DEAD", "invalid"],
      ]);

      const applied = items.find((item) => item.code === "LETO10")!;
      expect(applied.discount).to.equal(5.05);
      expect(applicationWords(applied).why).to.equal("");

      const refused = items.find((item) => item.code === "DEAD")!;
      expect(applicationWords(refused).why).to.equal("the code is not valid or has expired");
    });

    it("says in words why a working code gave nothing to this basket", async function () {
      await Promotion.update({ id: "summer" }, {
        configDiscount: { discountType: "percentage", discountAmount: 10, dishes: [], groups: [], excludeModifiers: true, minBasketTotal: 500 } as any,
      }).fetch();
      await basket("LETO10");

      const { items } = await promotionCodeApplications({ code: "LETO10" });
      expect(items[0].discount).to.equal(0);
      expect(applicationWords(items[0], { money: (amount) => `${amount} ₽` }).why).to.equal("the basket is below 500 ₽");
    });

    it("filters by code and by status", async function () {
      await basket("LETO10");
      await basket("NOBODYS");

      expect((await promotionCodeApplications({ code: "LETO10" })).items.map((item) => item.code)).to.deep.equal(["LETO10"]);
      expect((await promotionCodeApplications({ status: "invalid" })).items.map((item) => item.code)).to.deep.equal(["NOBODYS"]);
      expect((await promotionCodeApplications({ q: "nobody" })).items.map((item) => item.code)).to.deep.equal(["NOBODYS"]);
    });

    it("counts the money of the last days, by day and by code", async function () {
      await basket("LETO10");
      await basket("LETO10");
      await basket("NOBODYS");

      const stats = await promotionCodeStats({ days: 7 });
      expect(stats.applications).to.equal(3);
      expect(stats.applied).to.equal(2);
      expect(stats.invalid).to.equal(1);
      expect(stats.totalDiscount).to.equal(10.1);
      expect(stats.series).to.have.length(7);
      expect(stats.series[6].applications).to.equal(3);
      expect(stats.topCodes.map((top) => [top.code, top.applications])).to.deep.equal([["LETO10", 2], ["NOBODYS", 1]]);
      expect(stats.capped).to.equal(false);
    });

    it("a basket without a code is no application of one", async function () {
      await basket(null);
      expect((await promotionCodeApplications()).items).to.deep.equal([]);
      expect((await promotionCodeStats({ days: 7 })).applications).to.equal(0);
    });
  });
});
