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

import { UserRecord } from "../models/User";

// todo: fix types model instance to {%ModelName%}Record for User";
type Badge = "info" | "error";
type MessageGroupTo = "user" | "manager" | "device" | string
type ChannelType = "sms" | "email" | "mobile-push" | string

export abstract class Channel {
  public abstract type: ChannelType;

  // TODO: Add readStatus
  // public hasReadStatus: boolean = false;

  /**
   * If forceSend true it should send anytime
   */
  public abstract forceSend: boolean;
  public abstract forGroupTo: MessageGroupTo[];
  /**
   * The sorting will be from smallest to largest, the one who is smaller is the one who comes first
   */
  public abstract sortOrder: number;

  protected abstract send(badge: Badge, message: string, user: UserRecord, subject?: string, data?: object): Promise<void>;

  public async trySendMessage(badge: Badge, message: string, user: UserRecord, subject?: string, data?: object): Promise<boolean> {
    try {
      await this.send(badge, message, user, subject, data);
      return true;
    } catch (error) {
      sails.log.error(`Failed to send message through channel with sortOrder ${this.sortOrder}. Error: ${error}`);
      return false;
    }
  }
}

export class NotificationManager {

  public static async sendMessageToDeliveryManager(badge: Badge, text: string): Promise<void> {
    // I apologize what delivery message channel is direct to manager, its reason to null user. Time will show
    try {
      await NotificationManager.send(badge, "manager", text, null);
    } catch (error) {
      sails.log.warn(`✉️ Notification manager > console: ${badge}, ${text}`)
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
  public static async sendMessageToUser(badge: Badge, text: string, user: UserRecord | string, type?: ChannelType, subject?: string, data?: object): Promise<void> {
    let populatedUser;

    if(typeof user === "string") {
      const populatedUsers = await User.find({ where: { or: [{ id: user }, { login: user }] }}).populate('devices');
      if (populatedUsers.length === 1) {
        populatedUser = populatedUsers[0];
      } else {
        throw new Error(`User not found`);
      }
    } else {
      populatedUser = user;
    }

    await NotificationManager.send(badge, "user", text, populatedUser, type, subject, data);
  }

  public static readonly channels: Channel[] = [];

  public static send = async (
    badge: Badge,
    groupTo: MessageGroupTo,
    message: string,
    user?: UserRecord,
    channelType?: ChannelType,
    subject?: string,
    data?: object
  ): Promise<void> => {
    let sent = false;

    for (const channel of this.channels) {
      if(sent) break;
      if (!channel.forGroupTo.includes(groupTo)) continue;
      if (channelType && channel.type !== channelType) continue;

      if (sent && channel.forceSend !== true) {
        continue;
      }
      
      sent = await channel.trySendMessage(badge, message, user, subject, data);
    }

    if(!sent){
      throw new Error(`Failed to send message to group ${groupTo}, ${channelType ? channelType: ""}, message: ${message}`);
    }
  };

  public static isChannelExist = (channelType: string): boolean => {
    let isChannelExist = false
    NotificationManager.channels.forEach((ch) => {
      if (ch.type === channelType) {
        isChannelExist = true;
      }
    })
    return isChannelExist;
  }

  public static registerChannel = (channel: Channel): void => {
    NotificationManager.channels.push(channel);
    NotificationManager.channels.sort((a, b) => a.sortOrder - b.sortOrder);
  };
}
