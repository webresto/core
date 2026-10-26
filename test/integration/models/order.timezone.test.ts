import { expect } from "chai";
import { TimeZoneIdentifier } from "@webresto/worktime";
import { customer } from "../../mocks/customer";

/**
 * Order.check must not silently skip the work-time check when the configured TZ is
 * unknown to the worktime resolver (it used to log "WORK_TIME validation error" and pass).
 * The resolver is stubbed, so the test does not depend on which zones a worktime release knows.
 */
describe("Order.check: timezone unknown to the worktime resolver", function () {
  this.timeout(60000);
  // Not a legacy alias: those (Asia/Saigon) are normalized before the resolver sees them
  const UNKNOWN = "Mars/Olympus";
  const original = TimeZoneIdentifier.getTimeZoneGMTOffset;
  let savedEnvTZ: string | undefined;
  let orderId: string;

  before(async function () {
    savedEnvTZ = process.env.TZ;
    delete process.env.TZ;
    (TimeZoneIdentifier as any).getTimeZoneGMTOffset = function (zone?: string) {
      if (zone === UNKNOWN) throw Error(`Unknown timezone \`${zone}\``);
      return original.call(TimeZoneIdentifier, zone);
    };
    const dishes = await Dish.find({});
    const order = await Order.create({ id: "tz-unknown-cart" }).fetch();
    orderId = order.id;
    await Order.addDish({ id: orderId }, dishes[0], 1, [], "", "user");
    await Order.setSelfService({ id: orderId }, true);
  });

  after(async function () {
    (TimeZoneIdentifier as any).getTimeZoneGMTOffset = original;
    if (savedEnvTZ === undefined) delete process.env.TZ; else process.env.TZ = savedEnvTZ;
  });

  const check = async () => {
    try {
      await Order.check({ id: orderId }, customer, true, undefined, undefined);
      return null;
    } catch (e) {
      return e as any;
    }
  };

  it("refuses the order with code 19 instead of skipping the work-time check", async function () {
    await Settings.set("TZ" as any, { value: UNKNOWN } as any);
    expect(await Settings.get("TZ" as any)).to.equal(UNKNOWN);
    const error = await check();
    expect(error, "Order.check passed with an unresolvable TZ").to.not.equal(null);
    expect(error.code).to.equal(19);
  });

  it("a resolvable TZ is not refused for the timezone", async function () {
    await Settings.set("TZ" as any, { value: "Etc/GMT" } as any);
    const error = await check();
    expect(error?.code).to.not.equal(19);
  });
});
