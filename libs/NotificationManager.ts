/**
 * IDEA:
  First of all, we need to have an implementation of a library for each notification delivery provider, and an abstract channel class to allow for customization. This will enable us to implement more complex logic than what we currently have, such as channel balancing and selecting the most cost-effective option.

  For instance, you might have:
  - Two cost-effective delivery methods, but they only work for 300 messages per day.
  - One reliable backup option that is always available but more expensive.
  - Additionally, you can send a message to a messenger or a bot if the user has corresponding subscriptions and you're aware of them.
  - If push notifications to the app are possible for a user, then prioritize using push.

  Implementation-wise:
  - Thus, we need to write a custom SMS channel adapter that will manage the delivery of SMS messages to different providers. The SMS channel manager should be placed at the end of the delivery queue, and all quantities of sent SMS and balancing will be implemented in the channel or provider class.
  - Another SMS channel adapter (the expensive one) will utilize a gateway and have a lower priority. In this case, if the balancing of the cost-effective channels fails to deliver, the message will then be sent through the gateway.
  - For the bot, messenger, and web push, use respective channel classes and assign their weights.

  Messages sent via socket (e.g., GraphQL) directly to the front-end can be equated to push notifications.

  All messages should be stored in the database. If new messages appear there, they should be delivered.

  Each message has its own unique ID. Status messages like adding to cart or order ready for processing should be considered internal to prevent them from leaving the application's scope.

  It's necessary to integrate i18n to enable translation into different languages. Message templates should be defined through corresponding methods where they are called.

  The channel adapter itself should be an abstract class and will be checked by the notification manager.
 */
  import User from "../models/User";

  type Badge = "info" | "error";
  type MessageGroupTo = "user" | "manager" | "device" | string

  export abstract class Channel {
    public type: string = null;
    
    // TODO: Add readStatus
    // public hasReadStatus: boolean = false;

    /**
     * If forceSend true it should send anytime
     */
    public forceSend: boolean = false;
    public forGroupTo: MessageGroupTo[] = [];
    public sortOrder: number = 0;
    
    constructor() {}
  
    protected abstract send(badge: Badge, user: User, message: string, subject?: string, data?: object): Promise<void>;
    
    public async trySendMessage(badge: Badge, user: User, message: string, subject?: string, data?: object): Promise<boolean> {
      try {
        await this.send(badge, user, message, subject, data);
        return true;
      } catch (error) {
        console.error(`Failed to send message through channel with sortOrder ${this.sortOrder}. Error: ${error}`);
        return false;
      }
    }
  }
  
  export class NotificationManager {
    private static channels: Channel[] = [];
  
    public static send = async (
      badge: Badge,
      groupTo: MessageGroupTo,
      message: string,
      user: User,
      type?: string,
      subject?: string,
      data?: object
    ): Promise<void> => {  
      let sent = false;
  
      for (const channel of this.channels) {
        if(!channel.forGroupTo.includes(groupTo)) continue;
        if(type && channel.type !== type) continue;

        if (sent && channel.forceSend !== true) {
          continue;
        }
        sent = await channel.trySendMessage(badge, user,  message, subject, data);
      }
  
      if (!sent) {
        throw new Error(`Failed to send message to user ${user.id}`);
      }
    };

  
    public static registerChannel = (channel: Channel): void => {
      NotificationManager.channels.push(channel);
      NotificationManager.channels.sort((a, b) => a.sortOrder - b.sortOrder);
    };
  }