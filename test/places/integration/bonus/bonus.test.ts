import { expect } from "chai";
import { resetDatabase } from "../../support/reset";
import { startBonusSystem, TestBonusSystem } from "../../support/bonus";
import { add, CUSTOMER, newBasket, pickUpAt, thrown } from "../../support/storefront";

/**
 * Paying part of an order with bonuses. The bonus system is external: it keeps
 * the balance, core keeps a copy it syncs. At checkout the bonuses asked for are
 * rounded to the program's decimals and capped at its coverage of the amount the
 * strategy names; placing the order writes the spending to the system.
 *
 *   Bonus 1 covers at most half, to one decimal. Customer 1 has 1000 bonuses.
 *   The basket: five Dish 1 at 100 and three Dish 2 at 50 — 650.
 */
describe("Bonuses", function () {
  let system: TestBonusSystem;
  let bonusProgram: string;
  let user: any;
  let kitchen1: string;
  let dish1: string;
  let dish2: string;

  before(async function () {
    await resetDatabase();
    ({ system, bonusProgram } = await startBonusSystem());
    user = await User.create({ login: "15550000001", firstName: "Customer", lastName: "1", phone: { code: "1", number: "5550000001" } }).fetch();
    await UserBonusProgram.registration(user, "bonus-1");
    system.balances.set(user.id, 1000);

    const city = (await City.create({ name: "City 1" }).fetch()).id;
    kitchen1 = (await Place.create({ title: "Kitchen 1", city, enable: true, isCookingPoint: true, isPickupPoint: true }).fetch()).id;
    const group = await Group.create({ name: "Group 1", enable: true }).fetch();
    dish1 = (await Dish.create({ name: "Dish 1", price: 100, enable: true, parentGroup: group.id }).fetch()).id;
    dish2 = (await Dish.create({ name: "Dish 2", price: 50, enable: true, parentGroup: group.id }).fetch()).id;
  });

  async function basket(): Promise<string> {
    const id = await newBasket();
    await add(id, dish1, 5);
    await add(id, dish2, 3);
    await pickUpAt(id, kitchen1);
    return id;
  }
  const spend = (id: string, amount: number) =>
    Order.check({ id }, CUSTOMER, "pickup", undefined, undefined, user.id, { bonusProgramId: bonusProgram, amount } as any);

  it("the customer's copy of the balance follows the system", async function () {
    await UserBonusProgram.sync(user, bonusProgram);
    expect((await UserBonusProgram.findOne({ user: user.id, bonusProgram })).balance).to.equal(1000);
  });

  it("spends what was asked, rounded to the program's decimals, off the total", async function () {
    const id = await basket();
    await spend(id, 5.23);

    const order = await Order.findOne({ id });
    expect(order.bonusesTotal).to.equal(5.2);
    expect(order.total).to.equal(650 - 5.2);
  });

  it("covers no more than the program allows", async function () {
    const id = await basket();
    await spend(id, 900);
    expect((await Order.findOne({ id })).bonusesTotal).to.equal(325);
  });

  it("asking for none spends none", async function () {
    const id = await basket();
    await spend(id, 0);
    expect(await Order.findOne({ id })).to.deep.include({ bonusesTotal: 0, spendBonus: null });
  });

  it("is refused when the customer has fewer bonuses than they cover", async function () {
    system.balances.set(user.id, 40);
    try {
      const id = await basket();
      expect(await thrown(spend(id, 50))).to.deep.equal({ code: 27, error: "BONUS_BALANCE_INSUFFICIENT" });
      expect(await thrown(spend(id, 40))).to.equal(null);
    } finally {
      system.balances.set(user.id, 1000);
    }
  });

  it("are counted again on every recount, and a check without them takes them back", async function () {
    const id = await basket();
    await spend(id, 900);

    // A recount outside checkout, as a payment makes one: the bonuses stay off the total.
    const recounted = await Order.countCart({ id });
    expect([recounted.bonusesTotal, recounted.total]).to.deep.equal([325, 650 - 325]);

    await Order.check({ id }, CUSTOMER, "pickup", undefined, undefined, user.id);
    expect(await Order.findOne({ id })).to.deep.include({ bonusesTotal: 0, spendBonus: null, total: 650 });
  });

  it("placing the order writes what the bonuses covered, not what was asked", async function () {
    system.balances.set(user.id, 1000);
    const id = await basket();
    await spend(id, 900);

    await Order.order({ id });

    expect(system.balances.get(user.id)).to.equal(1000 - 325);
  });

  it("placing the order writes the spending to the system, and the copy follows", async function () {
    system.balances.set(user.id, 1000);
    const id = await basket();
    await spend(id, 10);

    await Order.order({ id });

    expect(system.balances.get(user.id)).to.equal(990);
    await UserBonusProgram.sync(user, bonusProgram);
    expect((await UserBonusProgram.findOne({ user: user.id, bonusProgram })).balance).to.equal(990);
  });

  it("an order spending bonuses of a program switched off is not placed", async function () {
    const id = await basket();
    await spend(id, 10);
    await BonusProgram.update({ id: bonusProgram }, { enable: false }).fetch();

    try {
      expect(await thrown(Order.order({ id }))).to.not.equal(null);
    } finally {
      await BonusProgram.update({ id: bonusProgram }, { enable: true }).fetch();
    }
  });
});
