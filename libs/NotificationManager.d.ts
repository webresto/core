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
import { DialogBox } from "../interfaces/DialogBox";
import User from "../models/User";
type Badge = "info" | "error";
type MessageGroupTo = "user" | "manager" | "device" | string;
type ChannelType = "sms" | "email" | string;
export declare abstract class Channel {
    abstract type: ChannelType;
    /**
     * If forceSend true it should send anytime
     */
    abstract forceSend: boolean;
    abstract forGroupTo: MessageGroupTo[];
    abstract sortOrder: number;
    protected abstract send(badge: Badge, message: string, user: User, subject?: string, data?: object): Promise<void>;
    trySendMessage(badge: Badge, message: string, user: User, subject?: string, data?: object): Promise<boolean>;
}
export declare class NotificationManager {
    static sendMessageToDeliveryManager(badge: Badge, text: string): Promise<void>;
    /**
     *
     * @param badge
     * @param text
     * @param user
     * @param type sms | email if not pass type it was delivered by a channel
     * @param subject
     * @param data
     */
    static sendMessageToUser(badge: Badge, text: string, user: User | string, type?: ChannelType, subject?: string, data?: object): Promise<void>;
    static readonly channels: Channel[];
    static send: (badge: Badge, groupTo: MessageGroupTo, message: string, user?: User, type?: ChannelType, subject?: string, data?: object) => Promise<void>;
    static isChannelExist: (channelType: string) => boolean;
    static registerChannel: (channel: Channel) => void;
    test(): void;
    ask(dialog: DialogBox, user: User, deviceId?: string, timeout?: number): void;
    answerProcess: (askId: string, optionId: string) => {};
}
export {};
