"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bcryptjs = __importStar(require("bcryptjs"));
const User_1 = __importDefault(require("../../../models/User"));
const adapters_1 = require("../../../adapters");
let user;
describe("User", function () {
    it("create new user", async function () {
        user = await User_1.default.create({ id: "111", login: "1123", lastName: 'TEST', firstName: "111", phone: { code: "1", number: "123" } }).fetch();
        if (!user.id)
            throw `UserID undefined`;
    });
    it("set user password", async function () {
        await Settings.set("PasswordRegex", { key: "PasswordRegex", value: "[0-9]" });
        await Settings.set("PasswordMinLength", { key: "PasswordMinLength", value: "8" });
        user = await User_1.default.setPassword(user.id, "1234567890", null);
        if (!await bcryptjs.compare("1234567890", user.passwordHash))
            throw "Password hash is corrupt";
        // Check oldPassword
        user = await User_1.default.setPassword(user.id, "00000000", "1234567890");
    });
    describe("Login [PASSWORD_POLICY: from_otp, CREATE_USER_IF_NOT_EXIST: true]", function () {
        it("user login Should fail if not passed required data", async function () {
            let err = [];
            try {
                await User_1.default.login("test", { code: "77", number: "8899" }, "deviceId-test", "device-name", null, null, "agent", "IP");
            }
            catch (error) {
                err.push(error);
            }
            try {
                await User_1.default.login("test", { code: "77", number: "8899" }, null, null, null, null, "agent", "IP");
            }
            catch (error) {
                err.push(error);
            }
            if (err.length !== 2)
                throw `Must be the error`;
        });
        it("create user fail with bad OTP", async function () {
            let err = [];
            try {
                await User_1.default.login("77889900", { code: "77", number: "889900" }, "deviceId-test", "device-name", null, "123456", "agent", "IP");
            }
            catch (error) {
                err.push(error);
            }
            if (err.length !== 1)
                throw `Must be the error`;
        });
        it("create user in login method", async function () {
            let OTPAdapter = await adapters_1.OTP.getAdapter();
            let otp = await OTPAdapter.get("778899");
            let login = await User_1.default.login("778899", { code: "77", number: "8899" }, "deviceId-test", "device-name", null, otp.password, "agent", "IP");
            let _user = await User_1.default.findOne({ login: "778899" });
            if (!_user)
                throw `user not found`;
            if (_user.phone.code !== "77" || _user.phone.number !== "8899")
                throw `bad phone`;
            if (!(await bcryptjs.compare(otp.password, _user.passwordHash))) {
                throw `Password not match`;
            }
            if (login.id !== "deviceId-test" || login.name !== "device-name")
                throw `bad login user device`;
            login = await User_1.default.login("778899", null, "deviceId-test3", "device-name3", otp.password, undefined, "agent", "IP");
        });
    });
    describe("Login [PASSWORD_POLICY: required, CREATE_USER_IF_NOT_EXIST: true]", function () {
        it("user login Should fail if not passed password", async function () {
            let err = [];
            await Settings.set("PASSWORD_POLICY", { key: "PASSWORD_POLICY", value: "required" });
            try {
                await User_1.default.login("test", { code: "77", number: "8899" }, "deviceId-test", "device-name", null, "123", "agent", "IP");
            }
            catch (error) {
                err.push(error);
            }
            if (err[0] !== "Password required")
                throw `Must be the error`;
        });
        it("create user with specific password", async function () {
            await Settings.set("PASSWORD_POLICY", { key: "PASSWORD_POLICY", value: "required" });
            await Settings.set("CORE_LOGIN_FIELD", { key: "CORE_LOGIN_FIELD", value: "email" });
            let OTPAdapter = await adapters_1.OTP.getAdapter();
            let otp = await OTPAdapter.get("test@mail.com");
            let login = await User_1.default.login("test@mail.com", null, "deviceId-test", "device-name", "password01", otp.password, "agent", "IP");
            let _user = await User_1.default.findOne({ login: "test@mail.com" });
            return;
            if (!_user)
                throw `user not found`;
            if (!(await bcryptjs.compare("password01", _user.passwordHash))) {
                throw `testing password not match`;
            }
            if (login.id !== "deviceId-test" || login.name !== "device-name")
                throw `bad login user device`;
            // Login
            login = await User_1.default.login("test@mail.com", null, "deviceId-test2", "device-name2", "password01", null, "agent", "IP");
            if (login.id !== "deviceId-test2" || login.name !== "device-name2")
                throw `bad login user device`;
            // Loging with bad password
            let err;
            try {
                await User_1.default.login("test@mail.com", null, "deviceId-test2", "device-name2", "bad-password01", null, "agent", "IP");
            }
            catch (error) {
                err = error;
            }
            if (err !== 'Password not match')
                throw `should error Password not match`;
        });
    });
});
