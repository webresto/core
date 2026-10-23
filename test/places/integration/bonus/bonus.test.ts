import { expect } from "chai";
import AuthService from "../../../../lib/AuthService";
import { Channel, NotificationManager } from "../../../../lib/notifications/NotificationManager";
import { NotificationTypeRegistry } from "../../../../lib/notifications/NotificationTypeRegistry";
import { resetDatabase, withSettings } from "../../support/reset";
import { startBonusSystem, TestBonusSystem } from "../../support/bonus";
import { add, CUSTOMER, newBasket, pickUpAt, thrown } from "../../support/storefront";

/**
 * Paying part of an order with bonuses. The bonus system is external: it keeps
 * the balance, core keeps a copy it syncs. Each check states the spending anew:
 * the bonuses asked for, capped at the program's coverage of the amount the
 * strategy names, down to its decimals, and no more than the system says the
 * customer has; placing the order writes what was counted to the system.
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
    user = await User.create({ firstName: "Customer", lastName: "1", phone: { code: "1", number: "5550000001" } }).fetch();
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
  // the globals are typed as possibly undefined: what the tests read and change, for sure
  const orderOf = (id: string) => Order.findOne!({ id });
  const membership = (customer: string) => UserBonusProgram.findOne!({ user: customer, bonusProgram });
  const setProgram = (values: Record<string, unknown>) => BonusProgram.updateOne!({ id: bonusProgram }).set(values as any);

  it("the customer's copy of the balance follows the system", async function () {
    await UserBonusProgram.sync(user, bonusProgram);
    expect((await membership(user.id)).balance).to.equal(1000);
  });

  it("spends what was asked, rounded to the program's decimals, off the total", async function () {
    const id = await basket();
    await spend(id, 5.23);

    const order = await orderOf(id);
    expect(order.bonusesTotal).to.equal(5.2);
    expect(order.total).to.equal(650 - 5.2);
  });

  it("covers no more than the program allows", async function () {
    const id = await basket();
    await spend(id, 900);
    expect((await orderOf(id)).bonusesTotal).to.equal(325);
  });

  it("asking for none spends none", async function () {
    const id = await basket();
    await spend(id, 0);
    expect(await orderOf(id)).to.deep.include({ bonusesTotal: 0, spendBonus: null });
  });

  it("placing the order writes the spending to the system, and the copy follows", async function () {
    system.balances.set(user.id, 1000);
    const id = await basket();
    await spend(id, 10);

    await Order.order({ id });

    expect(system.balances.get(user.id)).to.equal(990);
    await UserBonusProgram.sync(user, bonusProgram);
    expect((await membership(user.id)).balance).to.equal(990);
  });

  it("placing the order writes what the check counted, not what was asked", async function () {
    system.balances.set(user.id, 1000);
    const id = await basket();
    await spend(id, 900);
    expect(await orderOf(id)).to.deep.include({ bonusesTotal: 325, spendBonus: { bonusProgramId: bonusProgram, amount: 325, adapter: "bonus-1" } });

    await Order.order({ id });
    expect(system.balances.get(user.id)).to.equal(675);
  });

  it("refuses more than the system says the customer has, and says how much there is", async function () {
    system.balances.set(user.id, 100);
    try {
      const id = await basket();
      expect(await thrown(spend(id, 200))).to.deep.include({ code: 28, available: 100 });
      expect(await orderOf(id)).to.deep.include({ state: "CART", bonusesTotal: 0, spendBonus: null });
      expect(await thrown(spend(id, 100))).to.equal(null);
    } finally {
      system.balances.set(user.id, 1000);
    }
  });

  it("a check without bonuses takes off the spending of an earlier one", async function () {
    const id = await basket();
    await spend(id, 10);
    await Order.check({ id }, CUSTOMER, "pickup", undefined, undefined, user.id);
    expect(await orderOf(id)).to.deep.include({ bonusesTotal: 0, spendBonus: null, total: 650 });
  });

  it("refuses bonuses while spending them is off, or of a program switched off", async function () {
    const id = await basket();
    await withSettings({ ALLOW_BONUS_SPENDING: false }, async () => {
      expect(await thrown(spend(id, 10))).to.deep.include({ code: 29 });
    });
    await setProgram({ enable: false });
    try {
      expect(await thrown(spend(id, 10))).to.deep.include({ code: 29 });
    } finally {
      await setProgram({ enable: true });
    }
  });

  it("keeps the coverage as a share, once: 50 is a half; beyond 100% is refused", async function () {
    expect((await setProgram({ coveragePercentage: 50 }))?.coveragePercentage).to.equal(0.5);
    expect(String(await thrown(setProgram({ coveragePercentage: 150 })))).to.contain("from 0 to 100%");
    expect((await BonusProgram.findOne!({ id: bonusProgram })).coveragePercentage).to.equal(0.5);
  });

  it("an order spending bonuses of a program switched off is not placed", async function () {
    const id = await basket();
    await spend(id, 10);
    await setProgram({ enable: false });

    try {
      expect(await thrown(Order.order({ id }))).to.not.equal(null);
    } finally {
      await setProgram({ enable: true });
    }
  });

  // A login by the fixed code of the stand, the code carried by a channel of this file
  describe("a login", function () {
    class SmsChannel extends Channel {
      public type = "sms";
      public forceSend = false;
      public forGroupTo = ["user"];
      public sortOrder = 0;
      public cost = 0;
      protected async send(): Promise<void> {}
    }
    const sms = new SmsChannel();

    before(async function () {
      process.env.DEFAULT_OTP = "123456";
      NotificationManager.registerChannel(sms);
      await NotificationTypeRegistry.load();
    });
    after(function () {
      delete process.env.DEFAULT_OTP;
      NotificationManager.channels.splice(NotificationManager.channels.indexOf(sms), 1);
    });

    async function login(phone: string): Promise<string> {
      const deviceId = `device-${phone}`;
      const started = await AuthService.start({ purpose: "login", login: phone, deviceId });
      const done = await AuthService.submit(started.id as string, (started.step as any).id, "123456", { deviceId });
      expect(done.status).to.equal("done");
      return done.user as string;
    }

    it("puts the customer into a program with automatic registration, with the system's balance", async function () {
      const customer = await login("15550000002");
      expect(await membership(customer)).to.include({ isActive: true, balance: 0 });
      expect(system.balances.has(customer)).to.equal(true);
    });

    it("a customer who left a program is not put back by a login; joining again takes the same membership", async function () {
      const customer = await login("15550000004");
      const joined = await membership(customer);

      await UserBonusProgram.delete(customer, "bonus-1");
      expect(await membership(customer)).to.include({ isDeleted: true, isActive: false });

      await login("15550000004");
      expect(await membership(customer)).to.include({ isDeleted: true, isActive: false });
      expect(system.balances.has(customer)).to.equal(false);

      await UserBonusProgram.registration(customer, "bonus-1");
      expect(await UserBonusProgram.find!({ user: customer, bonusProgram })).to.have.length(1);
      expect(await membership(customer)).to.include({ id: joined.id, isDeleted: false, isActive: true });
    });

    it("leaves the customer out of a program without it", async function () {
      await setProgram({ automaticUserRegistration: false });
      try {
        const customer = await login("15550000003");
        expect(await membership(customer)).to.equal(undefined);
      } finally {
        await setProgram({ automaticUserRegistration: true });
      }
    });
  });
});
