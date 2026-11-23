import { expect } from "chai";
import { resetDatabase } from "../../support/reset";
import { add, newBasket } from "../../support/storefront";

/**
 * Promotions and a dish with variants (`interfaces/Variants.ts`). A line holds the variant, and the menu shows the
 * box a marketer picks: a variant is chosen by itself or by its box, in the products of a promotion and in its
 * exclusions alike. Neither a box nor a variant is a gift for now.
 *
 *   Group 1: Dish 1 — a box, Size 20 cm (400) and 30 cm (700); Dish 2 — ordinary, 100; Dish 3 — not for sale, 0.
 */
describe("Promotions: a dish with variants", function () {
  const SIZE = { key: "size", name: "Size", values: [{ value: 20, title: "20 cm" }, { value: 30, title: "30 cm" }] };
  let box: string;
  let small: string;
  let large: string;
  let dish2: string;
  let dish3: string;

  beforeEach(async function () {
    await resetDatabase();
    const group1 = (await Group.create!({ name: "Group 1", enable: true }).fetch()).id as string;
    const created: any = await Dish.create!({
      name: "Dish 1", price: 0, enable: true, parentGroup: group1,
      variants: { options: [SIZE], mappings: [{ values: { size: 20 }, price: 400, isDefault: true }, { values: { size: 30 }, price: 700 }] },
    } as any).fetch();
    box = created.id;
    [small, large] = created.variants.mappings.map((mapping: any) => mapping.rel);
    dish2 = (await Dish.create!({ name: "Dish 2", price: 100, enable: true, parentGroup: group1 }).fetch()).id as string;
    dish3 = (await Dish.create!({ name: "Dish 3", price: 0, enable: true, notForSale: true, parentGroup: group1 }).fetch()).id as string;
  });

  /** A flat 10 off each unit, as the admin saves it, switched on. */
  async function promotion(discount: Record<string, unknown>) {
    await Promotion.createOrUpdate!({
      id: "promotion-1", name: "Promotion 1", badge: "badge-1", description: "Description 1", externalId: "promotion-1",
      isJoint: true, isPublic: true, createdByUser: true, concept: ["origin"],
      configDiscount: { dishes: [], groups: [], excludeModifiers: true, discountType: "flat", discountAmount: 10, ...discount },
    } as any);
    await Promotion.update!({ id: "promotion-1" }, { enable: true }).fetch();
  }

  /** The discount of a basket of one of each variant and one Dish 2. */
  async function discount(): Promise<number> {
    const id = await newBasket();
    for (const dish of [small, large, dish2]) await add(id, dish);
    return (await Order.findOne!({ id })).discountTotal as number;
  }

  it("the box chosen: each of its variants is discounted", async function () {
    await promotion({ dishes: [box] });
    expect(await discount()).to.equal(20);
  });

  it("a variant chosen: that one only", async function () {
    await promotion({ dishes: [large] });
    expect(await discount()).to.equal(10);
  });

  it("the box excluded: none of its variants", async function () {
    await promotion({ dishes: ["*"], exclude: { dishes: [box] } });
    expect(await discount()).to.equal(10);
  });

  it("a variant excluded: the other variants of the chosen box still are", async function () {
    await promotion({ dishes: [box], exclude: { dishes: [small] } });
    expect(await discount()).to.equal(10);
  });

  it("the menu shows the discount on a variant chosen through its box", async function () {
    await promotion({ dishes: [box] });
    const shown = Adapter.getPromotionAdapter().displayDish({ ...(await Dish.findOne!({ id: large })) } as any);
    expect(shown.salePrice).to.equal(690);
  });

  it("neither the box nor a variant is a gift", async function () {
    const gift = (dishId: string) => Promotion.validateGift({ gift: { dishes: [{ dishId, amount: 1 }] } } as any);

    expect(await gift(box)).to.contain("variants");
    expect(await gift(small)).to.contain("variants");
    expect(await gift(dish3)).to.equal(null);
  });
});
