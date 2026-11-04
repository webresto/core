import { expect } from "chai";
import { resetDatabase } from "../../support/reset";
import { migrateOnlyByCode, ONLY_BY_CODE_MIGRATED } from "../../../../lib/marketing/only-by-code";

/**
 * The one-off move of C22 (`marketing.plan.md`): `enable` used to mean "applies by itself", and a promo code
 * applied a switched-off promotion all the same. It means "works at all" now, so the records that relied on the old
 * meaning have to keep the behaviour they had - a base of a running restaurant must not lose a live promo code on
 * the upgrade, and must not start giving a discount to everybody either.
 *
 * All three cases on one base:
 *   off and linked to a code  ->  on, "only by code"   it worked by its code; it still does, and says so
 *   off and linked to nothing ->  left as it is         it gave nothing before, and gives nothing now
 *   on                        ->  untouched
 */
describe("Promotions: the move to two switches", function () {
  async function promotion(id: string, values: Record<string, unknown>) {
    await Promotion.createOrUpdate({
      id, name: id, badge: "badge-1", description: id, externalId: id,
      isJoint: true, isPublic: true, createdByUser: true, concept: ["origin"],
      configDiscount: { discountType: "flat", discountAmount: 1, dishes: [], groups: [], excludeModifiers: true },
    } as any);
    await Promotion.update({ id }, values).fetch();
  }

  const read = async (id: string) => {
    const { enable, onlyByCode } = await Promotion.findOne({ id });
    return { enable, onlyByCode };
  };

  beforeEach(async function () {
    await resetDatabase();
    await promotion("off-with-code", { enable: false, sortOrder: 0 });
    await promotion("off-alone", { enable: false, sortOrder: 0 });
    await promotion("on-alone", { enable: true, sortOrder: 0 });
    await PromotionCode.create({ id: "code-1", description: "Code 1", code: "CODE1" }).fetch();
    await PromotionCode.addToCollection("code-1", "promotion", "off-with-code");
    await Settings.set(ONLY_BY_CODE_MIGRATED as any, { value: false, type: "boolean" } as any);
  });

  it("switches on the promotions that worked through a code, and marks them", async function () {
    const moved = await migrateOnlyByCode();

    expect(moved.ran).to.equal(true);
    expect(moved.movedToOnlyByCode).to.equal(1);
    expect(moved.leftOff).to.equal(1);
    expect(moved.names.join(" ")).to.contain("off-with-code");

    expect(await read("off-with-code")).to.deep.equal({ enable: true, onlyByCode: true });
    expect(await read("off-alone")).to.include({ enable: false });
    expect(await read("on-alone")).to.include({ enable: true });
  });

  it("the promotion it moved applies by its code and not by itself", async function () {
    await migrateOnlyByCode();

    const automatic = Promotion.getAllByConcept(["origin"]).map((promotion: any) => promotion.id);
    expect(automatic).to.contain("on-alone");
    expect(automatic).to.not.contain("off-with-code");

    const code = await PromotionCode.getValidPromotionCode("CODE1");
    expect(code?.promotion?.map((promotion: any) => promotion.id)).to.deep.equal(["off-with-code"]);
  });

  it("runs once: a promotion switched off afterwards is left alone", async function () {
    await migrateOnlyByCode();
    await Promotion.update({ id: "off-with-code" }, { enable: false, onlyByCode: false }).fetch();

    const again = await migrateOnlyByCode();
    expect(again.ran).to.equal(false);
    expect(await read("off-with-code")).to.deep.equal({ enable: false, onlyByCode: false });
  });
});
