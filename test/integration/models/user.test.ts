import { expect } from "chai";
import * as bcryptjs from "bcryptjs";
import User from "../../../models/User";

import { OTP } from "../../../adapters";

let user: User;
describe("User", function () {
  
  it("create new user", async function () {
     user = await User.create({id: "111", login: "1123", lastName: 'TEST', firstName: "111", phone: {code: "1", number:"123"}}).fetch();
     if (!user.id) throw `UserID undefined`
  });


  it("set user password", async function () {
    await Settings.set("PasswordRegex", "[0-9]");
    await Settings.set("PasswordMinLength", "8");
    user = await User.setPassword(user.id, "1234567890", null);
    if (!await bcryptjs.compare("1234567890", user.passwordHash)) throw "Password hash is corrupt"
    // Check oldPassword
    user = await User.setPassword(user.id, "00000000", "1234567890");
  });

  describe("Login", function () {

    it("user login Should fail if no Password or OTP", async function () {
      let err: Error[] = [];

      try {
        await User.login("test", {code: "77", number: "8899"},"deviceId-test", "device-name", null, null, "agent", "IP");
      } catch (error) {
        err.push(error);
      }
      if(err.length !== 1) throw `Must be the error`
    });

    it("create user in login method (CREATE_USER_IF_NOT_EXIST: true [default])", async function () {
      this.timeout(50000)
      let OTPAdapter = await OTP.getAdapter();
      let otp = await OTPAdapter.get("778899");
      console.log(otp)

      await User.login("778899", {code: "77", number: "8899"},"deviceId-test", "device-name", null, otp.password, "agent", "IP");
      let _user = await User.findOne({login: "778899"})
      if (!_user) throw `user not found`;
    });

    it("user>login with only OTP", async function () {
    
    });
  });
});
