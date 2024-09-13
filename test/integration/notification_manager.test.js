"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// todo: fix types model instance to {%ModelName%}Record for User';
const NotificationManager_1 = require("./../../libs/NotificationManager");
class TestChannel extends NotificationManager_1.Channel {
    constructor() {
        super(...arguments);
        this.forceSend = false;
        this.forGroupTo = ['user'];
        this.sortOrder = 0;
        this.type = "sms";
        this.lastMessage = "";
    }
    async send(badge, message, user, subject, data) {
        this.lastMessage = message;
    }
}
const testChannel = new TestChannel;
describe("NotificationManager", function () {
    it("add new channel", () => {
        NotificationManager_1.NotificationManager.registerChannel(testChannel);
        if (NotificationManager_1.NotificationManager.channels.length !== 1)
            throw `should 1`;
    });
    it("send message", () => {
        NotificationManager_1.NotificationManager.send("info", "user", "test123", null);
        if (testChannel.lastMessage !== "test123")
            throw `Problem in send Notification`;
    });
    it("is exist", () => {
        let result = NotificationManager_1.NotificationManager.isChannelExist('sms');
        if (!result)
            throw `Not exist??`;
    });
    it("OTP recive to user", async () => {
        const otpAdapter = await Adapter.getOTPAdapter();
        await Settings.set("CORE_LOGIN_FIELD", { key: "CORE_LOGIN_FIELD", value: "phone" });
        let a = await otpAdapter.get("1123");
        if (testChannel.lastMessage !== `Your code is ${a.password}`) {
            throw new Error(`bad message: ${testChannel.lastMessage}`);
        }
    });
});
