## Notification manager

### Introduction

This module provides a flexible notification system that allows messages to be sent to different recipients through various channels. It is designed to handle different types of notifications such as informational messages (`info`) or error notifications (`error`).

### Contents

1. **Channel Abstraction**
   - `Channel` abstract class serves as a blueprint for different notification channels. It defines properties and methods that must be implemented by specific channels.

   - **Properties:**
     - `type`: Indicates the type of the channel.
     - `forceSend`: If set to `true`, the message will be sent regardless of any conditions.
     - `forGroupTo`: Array of message group identifiers specifying the target recipients for this channel.
     - `sortOrder`: Priority level for this channel in the delivery queue.

   - **Methods:**
     - `send(badge, user, message, subject?, data?)`: Abstract method to send a notification. Must be implemented by each channel.
     - `trySendMessage(badge, user, message, subject?, data?)`: Attempts to send a message using this channel. Handles any potential errors.

2. **Notification Manager**
   - `NotificationManager` class manages the registration of channels and facilitates the sending of notifications.

   - **Static Methods:**
     - `send(badge, groupTo, message, user, type?, subject?, data?)`: Sends a notification to a specified group of recipients using available channels.
     - `registerChannel(channel)`: Registers a new channel for message delivery.

3. **Dialog boxes and user questions**
    In order to set expectations for the user's response, dialog boxes are provided. The process involves sending a dialogue to the frontend and waiting for a response; if no one has processed the dialogue, there will be a timeout

     - `ask(dialog: DialogBox, user: UserRecord, deviceId?: string, timeout?: number)`: It will try to send a question to a specific device, after which it will wait for its resolution, which should be sent to the method`answerProcess`
     - `answerProcess: (askId: string, optionId: string)`: Processes the user's response 

### Usage Examples

#### Example 1: Creating a New Channel

```typescript
class EmailChannel extends Channel {
  public type: 'email';
  public allowedRecipients: ['manager', 'user', 'device'];
  protected async send(badge: Badge, user: UserRecord, message: string, subject?: string, data?: object): Promise<void> {
    console.log(`Sending ${badge} email to ${user.email}: ${message}`);
  }
}
```

#### Example 2: Sending a Notification

```typescript
const user = new User(/* user details */);

try {
  NotificationManager.send("info", "user", "Your OTP is 123456", user);
} catch (error) {
  sails.log.error(error.message);
}
```

#### Example 3: Registering a Channel

```typescript
const emailChannel = new EmailChannel();
emailChannel.sortOrder = 1;
emailChannel.forceSend = true;
emailChannel.forGroupTo = ["user"];

NotificationManager.registerChannel(emailChannel);
```

### Important Notes

- Each channel must extend the `Channel` class and implement the `send` method.

- The `NotificationManager` allows for easy registration and management of notification channels.

- Channels can have different priorities (`sortOrder`) which determine their position in the delivery queue.

- The system supports different message groups (`MessageGroupTo`) for targeted notifications.

---

Feel free to modify and expand upon this documentation as needed for your specific use case. Let me know if you need further assistance!