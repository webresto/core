"use strict";
var _a;
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationManager = exports.Channel = void 0;
class Channel {
    constructor() {
        this.type = null;
        // TODO: Add readStatus
        // public hasReadStatus: boolean = false;
        /**
         * If forceSend true it should send anytime
         */
        this.forceSend = false;
        this.forGroupTo = [];
        this.sortOrder = 0;
    }
    async trySendMessage(badge, user, message, subject, data) {
        try {
            await this.send(badge, user, message, subject, data);
            return true;
        }
        catch (error) {
            console.error(`Failed to send message through channel with sortOrder ${this.sortOrder}. Error: ${error}`);
            return false;
        }
    }
}
exports.Channel = Channel;
class NotificationManager {
}
_a = NotificationManager;
NotificationManager.channels = [];
NotificationManager.send = async (badge, groupTo, message, user, type, subject, data) => {
    let sent = false;
    for (const channel of _a.channels) {
        if (!channel.forGroupTo.includes(groupTo))
            continue;
        if (type && channel.type !== type)
            continue;
        if (sent && channel.forceSend !== true) {
            continue;
        }
        sent = await channel.trySendMessage(badge, user, message, subject, data);
    }
    if (!sent) {
        throw new Error(`Failed to send message to user ${user.id}`);
    }
};
NotificationManager.registerChannel = (channel) => {
    NotificationManager.channels.push(channel);
    NotificationManager.channels.sort((a, b) => a.sortOrder - b.sortOrder);
};
exports.NotificationManager = NotificationManager;
