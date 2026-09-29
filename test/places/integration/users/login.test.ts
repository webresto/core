import { expect } from "chai";
import * as bcryptjs from "bcryptjs";
import { resetDatabase, withSettings } from "../../support/reset";
import { thrown } from "../../support/storefront";

/**
 * Logging in: by a one-time code or by a password, on a device. Out of the box
 * (`PASSWORD_POLICY: from_otp`) a code logs in, creates a customer seen for the
 * first time, and becomes their password; with `required` the customer sets a
 * password of their own. The device is bound to whoever logged in last.
 */
describe("Login", function () {
  const PHONE_1 = { code: "1", number: "5550000001" };
  const LOGIN_1 = "15550000001";

  beforeEach(async function () {
    await resetDatabase();
  });

  const otpFor = async (login: string) => (await (await Adapter.getOTPAdapter()).get(login)).password;
  const login = (who: string, phone: any, device: string, password: string | null, otp: string | null) =>
    User.login(who, phone, device, `Device ${device}`, password, otp, "agent-1", "127.0.0.1");

  it("needs a password or a code, and a device", async function () {
    expect(String(await thrown(login(LOGIN_1, PHONE_1, "device-1", null, null)))).to.contain("Password or OTP required");
    expect(String(await thrown(User.login(LOGIN_1, PHONE_1, null, null, null, "123456", "agent-1", "127.0.0.1")))).to.contain("deviceId required");
  });

  describe("by a one-time code", function () {
    it("creates a customer seen for the first time, verified, and binds the device", async function () {
      const otp = await otpFor(LOGIN_1);
      const device = await login(LOGIN_1, PHONE_1, "device-1", null, otp);

      const user = await User.findOne({ login: LOGIN_1 });
      expect(user).to.deep.include({ verified: true, phone: PHONE_1 });
      expect(device).to.include({ id: "device-1", name: "Device device-1", user: user.id, isLoggedIn: true, lastIP: "127.0.0.1" });
    });

    it("makes the code the customer's password", async function () {
      const otp = await otpFor(LOGIN_1);
      await login(LOGIN_1, PHONE_1, "device-1", null, otp);

      expect(await bcryptjs.compare(otp, (await User.findOne({ login: LOGIN_1 })).passwordHash)).to.equal(true);
      expect(await thrown(login(LOGIN_1, null, "device-2", otp, null))).to.equal(null);
    });

    it("a wrong code creates nobody", async function () {
      await otpFor(LOGIN_1);
      expect(String(await thrown(login(LOGIN_1, PHONE_1, "device-1", null, "000000")))).to.contain("User not found");
      expect(await User.count({ login: LOGIN_1 })).to.equal(0);
    });
  });

  describe("with a password of the customer's own", function () {
    const REQUIRED = { PASSWORD_POLICY: "required" };

    it("refuses a login without it", async function () {
      await withSettings(REQUIRED, async () => {
        expect(await thrown(login(LOGIN_1, PHONE_1, "device-1", null, "123456"))).to.equal("Password required");
      });
    });

    it("creates the customer with it, and refuses a wrong one after", async function () {
      await withSettings(REQUIRED, async () => {
        await login(LOGIN_1, PHONE_1, "device-1", "password-1", await otpFor(LOGIN_1));
        expect(await bcryptjs.compare("password-1", (await User.findOne({ login: LOGIN_1 })).passwordHash)).to.equal(true);

        expect(await thrown(login(LOGIN_1, null, "device-2", "password-1", null))).to.equal(null);
        expect(await thrown(login(LOGIN_1, null, "device-2", "password-2", null))).to.equal("Password not match");
      });
    });
  });

  it("a device another customer used is bound to whoever logs in on it now", async function () {
    await login(LOGIN_1, PHONE_1, "device-1", null, await otpFor(LOGIN_1));
    await login("15550000002", { code: "1", number: "5550000002" }, "device-1", null, await otpFor("15550000002"));

    const second = await User.findOne({ login: "15550000002" });
    expect((await UserDevice.findOne({ id: "device-1" })).user).to.equal(second.id);
  });

  describe("changing the password", function () {
    let user: any;

    beforeEach(async function () {
      await login(LOGIN_1, PHONE_1, "device-1", null, await otpFor(LOGIN_1));
      user = await User.findOne({ login: LOGIN_1 });
      await User.setPassword(user.id, "password-1", null, true);
    });

    it("needs the old password, and the right one", async function () {
      expect(await thrown(User.setPassword(user.id, "password-2", null))).to.equal("oldPassword is required");
      expect(await thrown(User.setPassword(user.id, "password-2", "password-9"))).to.equal("Old password is not accepted");

      await User.setPassword(user.id, "password-2", "password-1");
      expect(await bcryptjs.compare("password-2", (await User.findOne({ id: user.id })).passwordHash)).to.equal(true);
    });
  });
});
