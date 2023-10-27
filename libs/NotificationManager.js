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
    async trySendMessage(badge, message, user, subject, data) {
        try {
            await this.send(badge, message, user, subject, data);
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
    static async sendMessageToDeliveryManager(badge, text) {
        // I appologize what delivery message channel is direct to manager, its reason to null user. Time will show
        await NotificationManager.send(badge, "manager", text, null);
    }
    /**
     *
     * @param badge
     * @param text
     * @param user
     * @param type sms | email if not pass type it was deliver by an channel
     * @param subject
     * @param data
     */
    static async sendMessageToUser(badge, text, user, type, subject, data) {
        let populatedUser;
        if (typeof user === "string") {
            populatedUser = await User.find({ where: { or: [{ id: user }, { login: user }] } }).populate('devices');
        }
        else {
            populatedUser = user;
        }
        if (populatedUser.length !== 1) {
            throw new Error(`User not found`);
        }
        await NotificationManager.send(badge, "user", text, populatedUser, type, subject, data);
    }
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
        sent = await channel.trySendMessage(badge, message, user, subject, data);
    }
    if (!sent) {
        throw new Error(`Failed to send message to user ${user.id}`);
    }
};
NotificationManager.isChannelExist = (channelType) => {
    let isChannelExist = false;
    NotificationManager.channels.forEach((ch) => {
        if (ch.type === channelType) {
            isChannelExist = true;
        }
    });
    return isChannelExist;
};
NotificationManager.registerChannel = (channel) => {
    NotificationManager.channels.push(channel);
    NotificationManager.channels.sort((a, b) => a.sortOrder - b.sortOrder);
};
exports.NotificationManager = NotificationManager;
