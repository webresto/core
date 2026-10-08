import { expect } from "chai";
import AuthService from "../../../lib/AuthService";
import { CoreOtpAdapter } from "../../../adapters/auth/core/CoreOtpAdapter";
import { DishRecord } from "../../../models/Dish";

/**
 * REQUIRE_AUTH_FOR_CART (.ai-notes/auth/require-auth-for-cart.md).
 *
 * The barrier sits in core rather than only in the API layer, so this is the behaviour every
 * integration gets. Asserted here is exactly what the flag promises and nothing beyond it:
 *
 *   - off, the guest cart of today is untouched (this is the default, so it is the case that
 *     must never regress);
 *   - on, an anonymous order can neither become a cart nor take a dish;
 *   - on, a signed-in order is unaffected;
 *   - on, items the server places itself (`addedBy !== "user"` — ORDER_INIT_PRODUCT_ID,
 *     promotions) still land, because blocking those would break carts the operator never
 *     meant to block;
 *   - on, but with no sign-in method enabled, the flag is ignored (§3.5): a cart that demands
 *     a login nobody can pass is a closed shop, not a protected one.
 */
describe("Order: REQUIRE_AUTH_FOR_CART", function () {
  this.timeout(20000);

  let dishes: DishRecord[];
  let userId: string;

  /** `type` is passed explicitly: the manifest is seeded by the hook, which the test app skips. */
  async function setFlag(value: boolean) {
    await Settings.set("REQUIRE_AUTH_FOR_CART", { key: "REQUIRE_AUTH_FOR_CART", type: "boolean", value: value });
  }

  before(async function () {
    // The fixture ships every dish disabled and is enabled by whichever sync test ran first, so
    // pick two and enable them here — these cases must not depend on test order.
    const pool = await Dish.find({ modifier: false }).limit(2);
    await Dish.update({ id: pool.map((dish) => dish.id) }, { enable: true, notForSale: false });
    dishes = await Dish.find({ id: pool.map((dish) => dish.id) });

    const account = await AuthService.materializeUser({
      phone: { code: "7", number: "9995559001" },
      firstName: "Cart owner",
    });
    userId = account.user.id as string;

    // The flag only applies while somebody can sign in (§3.5), so the cases that expect it to
    // bite need a live login method — the core's own, the way afterHook registers it.
    if (!AuthMethod.getAdapter("core", "sms")) await new CoreOtpAdapter().wait();
    await AuthMethod.updateOne({ adapter: "core", offer: "sms" }, { enable: true, healthStatus: "ready" });
  });

  afterEach(async function () {
    await setFlag(false);
  });

  it("off: a guest still gets a cart", async function () {
    await setFlag(false);
    const order = await Order.create({ id: "test.require-auth.off" }).fetch();

    await Order.addDish({ id: order.id }, dishes[0], 1, [], "", "user");

    expect((await Order.findOne({ id: order.id })).state).to.equal("CART");
  });

  it("on: a guest cannot add a dish, and the order stays NEW", async function () {
    const order = await Order.create({ id: "test.require-auth.guest-add" }).fetch();
    await setFlag(true);

    let thrown: any = null;
    try {
      await Order.addDish({ id: order.id }, dishes[0], 1, [], "", "user");
    } catch (e) {
      thrown = e;
    }

    expect(thrown, "addDish must refuse an anonymous order").to.be.an("object");
    expect(thrown.code).to.equal(1);
    expect((await Order.findOne({ id: order.id })).state).to.equal("NEW");
  });

  it("on: NEW -> CART is closed on every route, not just addDish", async function () {
    const order = await Order.create({ id: "test.require-auth.guest-docart" }).fetch();
    await setFlag(true);

    let thrown: any = null;
    try {
      await Order.doCart({ id: order.id });
    } catch (e) {
      thrown = e;
    }

    expect(thrown, "doCart must refuse an anonymous order").to.be.an("object");
    expect(thrown.code).to.equal(1);
    expect((await Order.findOne({ id: order.id })).state).to.equal("NEW");
  });

  it("on: a signed-in order is unaffected", async function () {
    const order = await Order.create({ id: "test.require-auth.user", user: userId }).fetch();
    await setFlag(true);

    await Order.addDish({ id: order.id }, dishes[0], 1, [], "", "user");

    expect((await Order.findOne({ id: order.id })).state).to.equal("CART");
  });

  it("on: items the server places itself still land", async function () {
    // Started while the flag was off — the state the operator creates by flipping the switch
    // on a live site, and the state ORDER_INIT_PRODUCT_ID / promotions have to survive.
    await setFlag(false);
    const order = await Order.create({ id: "test.require-auth.core-item" }).fetch();
    await Order.addDish({ id: order.id }, dishes[0], 1, [], "", "user");

    await setFlag(true);
    await Order.addDish({ id: order.id }, dishes[1], 1, [], "", "core");

    const placed = await OrderDish.find({ order: order.id });
    expect(placed.filter((orderDish) => orderDish.addedBy === "core")).to.have.lengthOf(1);
    expect((await Order.findOne({ id: order.id })).state).to.equal("CART");
  });

  it("on: ORDER_INIT_PRODUCT_ID still fills an anonymous order, and create() settles", async function () {
    // review2 §4.1. The gate used to fire inside afterCreate — addDish("core") → doCart on a NEW
    // order — and afterCreate throws before calling back, so `Order.create().fetch()` never
    // resolved at all. A hang, not an error, on every non-GraphQL creation of an anonymous order.
    await Settings.set("ORDER_INIT_PRODUCT_ID", { key: "ORDER_INIT_PRODUCT_ID", type: "string", value: dishes[1].id });
    await setFlag(true);
    try {
      const created = await Promise.race([
        Order.create({ id: "test.require-auth.init-product" }).fetch(),
        new Promise((_, reject) => setTimeout(() => reject(new Error("Order.create never settled")), 5000)),
      ]) as any;

      expect(created.id).to.equal("test.require-auth.init-product");
      const placed = await OrderDish.find({ order: created.id });
      expect(placed.filter((orderDish) => orderDish.addedBy === "core"), "the init product must still land").to.have.lengthOf(1);
      expect((await Order.findOne({ id: created.id })).state).to.equal("CART");

      // …and the customer is still stopped on the very same order.
      let thrown: any = null;
      try {
        await Order.addDish({ id: created.id }, dishes[0], 1, [], "", "user");
      } catch (e) {
        thrown = e;
      }
      expect(thrown, "the flag still applies to the customer").to.be.an("object");
    } finally {
      await Settings.set("ORDER_INIT_PRODUCT_ID", { key: "ORDER_INIT_PRODUCT_ID", type: "string", value: null });
    }
  });

  it("on: a guest cannot check out a cart that is already anonymous", async function () {
    // review2 §4.2. addDish/doCart guard the way in; without a gate here the invariant only held
    // for carts assembled after the flag went on — one filled while it was off, or by a
    // promotion, or on another device, still walked through checkout with no account behind it.
    await setFlag(false);
    const order = await Order.create({ id: "test.require-auth.guest-check" }).fetch();
    await Order.addDish({ id: order.id }, dishes[0], 1, [], "", "user");
    await setFlag(true);

    let thrown: any = null;
    try {
      await Order.check({ id: order.id }, { name: "Guest", phone: { code: "7", number: "9995559002" } } as any, true);
    } catch (e) {
      thrown = e;
    }

    expect(thrown, "check() must refuse an anonymous cart").to.be.an("object");
    expect(thrown.code, JSON.stringify(thrown)).to.equal(20);
    expect(thrown.error).to.equal("authorization required");
  });

  it("on: the same cart passes the gate once it belongs to an account", async function () {
    await setFlag(false);
    const order = await Order.create({ id: "test.require-auth.user-check", user: userId }).fetch();
    await Order.addDish({ id: order.id }, dishes[0], 1, [], "", "user");
    await setFlag(true);

    let thrown: any = null;
    try {
      await Order.check({ id: order.id }, { name: "Cart owner", phone: { code: "7", number: "9995559001" } } as any, true);
    } catch (e) {
      thrown = e;
    }

    // check() has plenty of other reasons to refuse in a fixture (payment method, work time);
    // what this asserts is only that AUTHORIZATION is no longer one of them.
    expect(thrown?.code, `authorization must not be the refusal here: ${JSON.stringify(thrown)}`).to.not.equal(20);
  });

  it("on, but nobody can sign in: the flag is ignored and the guest still gets a cart", async function () {
    // Every enabled method goes dark for the duration of the case — the state an upgrade from
    // 2.5 used to land in (review2 §1.1). The demand cannot be met, so it is not made.
    const live = await AuthMethod.find({ enable: true });
    await AuthMethod.update({ id: live.map((row) => row.id) }, { enable: false });
    try {
      await setFlag(true);
      expect(await AuthService.cartRequiresAuth()).to.equal(false);

      const order = await Order.create({ id: "test.require-auth.no-method" }).fetch();
      await Order.addDish({ id: order.id }, dishes[0], 1, [], "", "user");

      expect((await Order.findOne({ id: order.id })).state).to.equal("CART");
    } finally {
      await AuthMethod.update({ id: live.map((row) => row.id) }, { enable: true });
    }
    // Back on the air, the flag bites again — nothing about the ignore is sticky.
    expect(await AuthService.cartRequiresAuth()).to.equal(true);
  });
});
