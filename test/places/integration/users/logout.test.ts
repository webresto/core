import { expect } from "chai";
import AuthService from "../../../../lib/AuthService";
import { resetDatabase } from "../../support/reset";

/**
 * Signing a device out (`logout`, `logoutFromAllDevices` of graphql - `UserDevice.logout`): the device
 * is a guest again, and the baskets it was assembling for the account (NEW, CART, CHECKOUT) stay the
 * account's but leave the device - its next basket is a guest one, the account's one does not come to
 * it any more. What the account has placed keeps its device, and so does what is not the account's.
 *
 *   User 1 on Device 1 and Device 2, User 2 on Device 3.
 */
describe("Logout", function () {
  let user1: string;
  let user2: string;

  beforeEach(async function () {
    await resetDatabase();
    user1 = (await AuthService.materializeUser({ firstName: "Customer", lastName: "1", phone: { code: "1", number: "5550000021", additionalNumber: "" } })).user.id!;
    user2 = (await AuthService.materializeUser({ firstName: "Customer", lastName: "2", phone: { code: "1", number: "5550000022", additionalNumber: "" } })).user.id!;
    await UserDevice.create!({ id: "device-1", user: user1, isLoggedIn: true, sessionId: "session-1", lastIP: "" }).fetch();
    await UserDevice.create!({ id: "device-2", user: user1, isLoggedIn: true, sessionId: "session-2", lastIP: "" }).fetch();
    await UserDevice.create!({ id: "device-3", user: user2, isLoggedIn: true, sessionId: "session-3", lastIP: "" }).fetch();
  });

  /** A basket as it is: its owner, its device and its state written as they are. */
  async function basket(name: string, values: Record<string, unknown>): Promise<void> {
    const order = await Order.create!({ comment: name }).fetch();
    await (Order.update!({ id: order.id }, values) as any).meta({ skipAllLifecycleCallbacks: true }).fetch();
  }

  /** `{ name: deviceId }` of the baskets, and who owns them. */
  async function baskets(): Promise<Record<string, { deviceId: string; user: string | null }>> {
    const out: Record<string, { deviceId: string; user: string | null }> = {};
    for (const order of await Order.find!({})) out[order.comment!] = { deviceId: order.deviceId, user: (order.user as string) ?? null };
    return out;
  }

  it("unbinds the account's baskets from the device signed out, and the device is a guest", async function () {
    await basket("Order 1", { user: user1, deviceId: "device-1", state: "NEW" });
    await basket("Order 2", { user: user1, deviceId: "device-1", state: "CART" });
    await basket("Order 3", { user: user1, deviceId: "device-1", state: "CHECKOUT" });
    await basket("Order 4", { user: user1, deviceId: "device-1", state: "ORDER" });
    await basket("Order 5", { user: null, deviceId: "device-1", state: "CART" });
    await basket("Order 6", { user: user1, deviceId: "device-2", state: "CART" });

    await UserDevice.logout({ id: "device-1", user: user1 });

    expect(await baskets()).to.deep.equal({
      "Order 1": { deviceId: "", user: user1 },
      "Order 2": { deviceId: "", user: user1 },
      "Order 3": { deviceId: "", user: user1 },
      "Order 4": { deviceId: "device-1", user: user1 },
      "Order 5": { deviceId: "device-1", user: null },
      "Order 6": { deviceId: "device-2", user: user1 },
    });
    // Its session is gone: a token of it verifies no more, so the next basket of the device is a guest one.
    expect(await UserDevice.findOne!({ id: "device-1" })).to.include({ isLoggedIn: false, sessionId: null });
    expect(await UserDevice.checkSession("session-1", user1)).to.equal(false);
    expect(await UserDevice.checkSession("session-2", user1)).to.equal(true);
  });

  it("signs out nothing of a device of another account", async function () {
    await basket("Order 1", { user: user2, deviceId: "device-3", state: "CART" });

    await UserDevice.logout({ id: "device-3", user: user1 });

    expect(await baskets()).to.deep.equal({ "Order 1": { deviceId: "device-3", user: user2 } });
    expect(await UserDevice.checkSession("session-3", user2)).to.equal(true);
  });

  it("signs every device of the account out and unbinds the baskets of each, from all devices", async function () {
    await basket("Order 1", { user: user1, deviceId: "device-1", state: "CART" });
    await basket("Order 2", { user: user1, deviceId: "device-2", state: "CHECKOUT" });
    await basket("Order 3", { user: user2, deviceId: "device-3", state: "CART" });

    await UserDevice.logout({ user: user1 });

    expect(await baskets()).to.deep.equal({
      "Order 1": { deviceId: "", user: user1 },
      "Order 2": { deviceId: "", user: user1 },
      "Order 3": { deviceId: "device-3", user: user2 },
    });
    expect(await UserDevice.checkSession("session-1", user1)).to.equal(false);
    expect(await UserDevice.checkSession("session-2", user1)).to.equal(false);
    expect(await UserDevice.checkSession("session-3", user2)).to.equal(true);
  });
});
