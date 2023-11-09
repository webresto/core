"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const NotificationManager_1 = require("@webresto/core/libs/NotificationManager");
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
    it("NotificationManager add new channel", () => {
        NotificationManager_1.NotificationManager.registerChannel(testChannel);
        if (NotificationManager_1.NotificationManager.channels.length !== 1)
            throw `should 1`;
    });
    it("NotificationManager send message", () => {
        NotificationManager_1.NotificationManager.send("info", "user", "test123", null);
        if (testChannel.lastMessage !== "test123")
            throw `Problem in send Ntification`;
    });
});
