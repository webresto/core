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

  describe("Login [PASSWORD_POLICY: from_otp, CREATE_USER_IF_NOT_EXIST: true]", function () {

    it("user login Should fail if not passed required data", async function () {
      let err: Error[] = [];
  
      try {
        await User.login("test", {code: "77", number: "8899"},"deviceId-test", "device-name", null, null, "agent", "IP");
      } catch (error) {
        err.push(error);
      }
  
      try {
        await User.login("test", {code: "77", number: "8899"},null, null, null, null, "agent", "IP");
      } catch (error) {
        err.push(error);
      }
  
      if(err.length !== 2) throw `Must be the error`
    });

    it("create user fail with bad OTP", async function () {
      let err = [];
      try {    
        await User.login("77889900", {code: "77", number: "889900"},"deviceId-test", "device-name", null, "123456", "agent", "IP");
      } catch (error) {
        err.push(error);
      }

      if(err.length !== 1) throw `Must be the error`
    });

    it("create user in login method", async function () {
      let OTPAdapter = await OTP.getAdapter();
      let otp = await OTPAdapter.get("778899");
   
      let login = await User.login("778899", {code: "77", number: "8899"},"deviceId-test", "device-name", null, otp.password, "agent", "IP");
      let _user = await User.findOne({login: "778899"})
      
      if (!_user) throw `user not found`;
      if (_user.phone.code !== "77" || _user.phone.number !== "8899") throw `bad phone`
      
      if (!(await bcryptjs.compare(otp.password, _user.passwordHash))) {
        throw `Password not match`;
      }


      if (login.id !== "deviceId-test" || login.name !== "device-name") throw `bad login user device`

      login = await User.login("778899", null, "deviceId-test3", "device-name3", otp.password, undefined, "agent", "IP");      
    });




  });


  describe("Login [PASSWORD_POLICY: required, CREATE_USER_IF_NOT_EXIST: true]", function () {
    it("user login Should fail if not passed password", async function () {
      let err: string[] = [];
  
      await Settings.set("PASSWORD_POLICY", "required") 
      try {
        await User.login("test", {code: "77", number: "8899"},"deviceId-test", "device-name", null, "123", "agent", "IP");
      } catch (error) {
        err.push(error);
      }
      if(err[0] !== "Password required") throw `Must be the error`
    });




    it("create user with specific password", async function () {
      console.log("start !!!!!!!!!!!")
      await Settings.set("PASSWORD_POLICY", "required") 
      await Settings.set("LOGIN_FIELD", "email") 

      let OTPAdapter = await OTP.getAdapter();
      let otp = await OTPAdapter.get("test@mail.com");
      console.log(otp)

      let login = await User.login("test@mail.com", null,"deviceId-test", "device-name", "password01", otp.password, "agent", "IP");
      let _user = await User.findOne({login: "test@mail.com"})
      
      return
      if (!_user) throw `user not found`;
      if (!(await bcryptjs.compare("password01", _user.passwordHash))) {
        throw `testing password not match`;
      }
      if (login.id !== "deviceId-test" || login.name !== "device-name") throw `bad login user device`

      // Login
      login = await User.login("test@mail.com", null,"deviceId-test2", "device-name2", "password01", null, "agent", "IP");
      if (login.id !== "deviceId-test2" || login.name !== "device-name2") throw `bad login user device`
  

      // Loging with bad password
      let err:string;
      try {
        await User.login("test@mail.com", null,"deviceId-test2", "device-name2", "bad-password01", null, "agent", "IP");
      } catch (error) {
        err = error
      }
      if (err !== 'Password not match') throw `should error Password not match`

    });



  });
});
