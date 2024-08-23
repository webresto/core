"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationManager = exports.Channel = void 0;
class Channel {
    async trySendMessage(badge, message, user, subject, data) {
        try {
            await this.send(badge, message, user, subject, data);
            return true;
        }
        catch (error) {
            sails.log.error(`Failed to send message through channel with sortOrder ${this.sortOrder}. Error: ${error}`);
            return false;
        }
    }
}
exports.Channel = Channel;
class NotificationManager {
    static async sendMessageToDeliveryManager(badge, text) {
        // I apologize what delivery message channel is direct to manager, its reason to null user. Time will show
        try {
            await NotificationManager.send(badge, "manager", text, null);
        }
        catch (error) {
            sails.log.warn(`✉️ Notification manager > console: ${badge}, ${text}`);
        }
    }
    /**
     *
     * @param badge
     * @param text
     * @param user
     * @param type sms | email if not pass type it was delivered by a channel
     * @param subject
     * @param data
     */
    static async sendMessageToUser(badge, text, user, type, subject, data) {
        let populatedUser;
        if (typeof user === "string") {
            const populatedUsers = await User.find({ where: { or: [{ id: user }, { login: user }] } }).populate('devices');
            if (populatedUsers.length === 1) {
                populatedUser = populatedUsers[0];
            }
            else {
                throw new Error(`User not found`);
            }
        }
        else {
            populatedUser = user;
        }
        await NotificationManager.send(badge, "user", text, populatedUser, type, subject, data);
    }
    static channels = [];
    static send = async (badge, groupTo, message, user, channelType, subject, data) => {
        let sent = false;
        for (const channel of this.channels) {
            if (sent)
                break;
            if (!channel.forGroupTo.includes(groupTo))
                continue;
            if (channelType && channel.type !== channelType)
                continue;
            if (sent && channel.forceSend !== true) {
                continue;
            }
            sent = await channel.trySendMessage(badge, message, user, subject, data);
        }
        if (!sent) {
            throw new Error(`Failed to send message to group ${groupTo}, ${channelType ? channelType : ""}, message: ${message}`);
        }
    };
    static isChannelExist = (channelType) => {
        let isChannelExist = false;
        NotificationManager.channels.forEach((ch) => {
            if (ch.type === channelType) {
                isChannelExist = true;
            }
        });
        return isChannelExist;
    };
    static registerChannel = (channel) => {
        NotificationManager.channels.push(channel);
        NotificationManager.channels.sort((a, b) => a.sortOrder - b.sortOrder);
    };
}
exports.NotificationManager = NotificationManager;
