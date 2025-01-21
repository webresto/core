"use strict";
/**
 * IDEA:
  First of all, we need to have an implementation of a library for each notification delivery provider, and an abstract channel class to allow for customization. This will enable us to implement more complex logic than what we currently have, such as channel balancing and selecting the most cost-effective option.

  For instance, you might have:
  - Two cost-effective delivery methods, but they only work for 300 messages per day.
  - One reliable backup option that is always available but more expensive.
  - Additionally, you can send a message to a messenger or a bot if the user has corresponding subscriptions, and you're aware of them.
  - If push notifications to the app are possible for a user, then prioritize using push.

  Implementation-wise:
  - Thus, we need to write a custom SMS channel adapter that will manage the delivery of SMS messages to different providers. The SMS channel manager should be placed at the end of the delivery queue, and all quantities of sent SMS and balancing will be implemented in the channel or provider class.
  - Another SMS channel adapter (the expensive one) will utilize a gateway and have a lower priority. In this case, if the balancing of the cost-effective channels fails to deliver, the message will then be sent through the gateway.
  - For the bot, messenger, and web push, use the respective channel classes and assign their weights.

  Messages sent via socket (e.g., GraphQL) directly to the front-end can be equated to push notifications.

  All messages should be stored in the database. If new messages appear there, they should be delivered.

  Each message has its own unique ID. Status messages like adding to cart or order ready for processing should be considered internal to prevent them from leaving the application's scope.

  It's necessary to integrate i18n to enable translation into different languages. Message templates should be defined through corresponding methods where they are called.

  The channel adapter itself should be an abstract class and will be checked by the notification manager.
 */
var _a;
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
            await _a.send(badge, "manager", text, null);
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
        await _a.send(badge, "user", text, populatedUser, type, subject, data);
    }
}
exports.NotificationManager = NotificationManager;
_a = NotificationManager;
NotificationManager.channels = [];
NotificationManager.send = async (badge, groupTo, message, user, channelType, subject, data) => {
    let sent = false;
    for (const channel of _a.channels) {
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
NotificationManager.isChannelExist = (channelType) => {
    let isChannelExist = false;
    _a.channels.forEach((ch) => {
        if (ch.type === channelType) {
            isChannelExist = true;
        }
    });
    return isChannelExist;
};
NotificationManager.registerChannel = (channel) => {
    _a.channels.push(channel);
    _a.channels.sort((a, b) => a.sortOrder - b.sortOrder);
};
