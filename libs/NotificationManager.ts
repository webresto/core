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
import { UserDeviceRecord } from "../models/UserDevice";

// todo: fix types model instance to {%ModelName%}Record for User";
type Badge = "info" | "error";
type MessageGroupTo = "user" | "manager" | "device" | string
type ChannelType = "sms" | "email" | "mobile-push" | string
export type ChannelStatus = "ready" | "error" | string
export type ChannelManagerState = {
  enabled?: boolean
  sortOrder?: number
  cost?: number
}
type ChannelManagerStateMap = Record<string, ChannelManagerState>
type ChannelSettingsUpdate = {
  enabled?: boolean
  sortOrder?: number
  cost?: number
}

export type DeliveryStatus = {
  delivered: boolean
  read?: boolean
  deliveredAt?: Date
  readAt?: Date
  raw?: object
}

const NOTIFICATION_CHANNELS_GLOBAL_KEY = "__restoappNotificationManagerChannels";
const NOTIFICATION_CHANNELS_STATE_SETTING_KEY = "NOTIFICATION_CHANNELS_STATE";
const NOTIFICATION_CHANNELS_STATE_SETTING = require("../settings/notification_channels_state.json");

function getSharedChannelsRegistry(): Channel[] {
  const globalScope = globalThis as any;
  if (!Array.isArray(globalScope[NOTIFICATION_CHANNELS_GLOBAL_KEY])) {
    globalScope[NOTIFICATION_CHANNELS_GLOBAL_KEY] = [];
  }
  return globalScope[NOTIFICATION_CHANNELS_GLOBAL_KEY] as Channel[];
}

export abstract class Channel {
  public abstract type: ChannelType;

  /**
   * Channel-level status for admin diagnostics.
   * Use "error" when the adapter detected a persistent channel problem.
   */
  public status: ChannelStatus = "ready";

  /**
   * Human-readable channel-level error for admin diagnostics.
   * Keep null when there is no persistent channel problem.
   */
  public error: string | null = null;

  /**
   * Runtime switch stored on the channel instance in NotificationManager.channels.
   * Disabled channels stay visible in admin, but are skipped by delivery.
   */
  public enabled: boolean = true;

  public isEnabled(): boolean {
    return this.enabled !== false;
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled === true;
  }

  public setSortOrder(sortOrder: number): void {
    this.sortOrder = sortOrder;
  }

  public setCost(cost: number): void {
    this.cost = cost;
  }

  public setStatus(status: ChannelStatus, error: string | null = null): void {
    this.status = status || "ready";
    this.error = error;
  }

  /**
   * If forceSend true it should send anytime (e.g. audit channels)
   */
  public abstract forceSend: boolean;
  public abstract forGroupTo: MessageGroupTo[];
  /**
   * The sorting will be from smallest to largest, the one who is smaller is the one who comes first
   */
  public abstract sortOrder: number;
  /**
   * Cost per message in arbitrary units (e.g. USD cents).
   * 0 = free (WebSocket, FCM). Used for channel ordering: free channels go first.
   */
  public abstract cost: number;

  /**
   * Check if channel is operational before attempting to send.
   * Default: always ready. Override for health checks (e.g. check if firebase-admin initialized).
   */
  public async isReady(): Promise<boolean> {
    return true;
  }

  /**
   * Whether the channel has the minimum settings filled in by the operator.
   * Default: true (no setup required). Override when the adapter needs operator-provided
   * credentials before it can be used — e.g. FCM service account, SMS API key.
   * Distinct from isReady(): a channel can be configured but currently not operational.
   */
  public async isConfigured(): Promise<boolean> {
    return true;
  }

  /**
   * Admin-panel URL where the operator can finish configuring this channel.
   * Returned to the channels overview so the UI can link directly to the settings page.
   */
  public getConfigUrl(): string | null {
    return null;
  }

  protected abstract send(
    badge: Badge,
    message: string,
    user: UserRecord,
    subject?: string,
    data?: object,
    priorityDevice?: UserDeviceRecord
  ): Promise<string | void>;

  public async trySendMessage(
    badge: Badge,
    message: string,
    user: UserRecord,
    subject?: string,
    data?: object,
    priorityDevice?: UserDeviceRecord
  ): Promise<boolean> {
    if (!this.isEnabled()) {
      sails.log.verbose(`[NotificationManager] Channel ${this.type} disabled, skipping`);
      return false;
    }
    try {
      await this.send(badge, message, user, subject, data, priorityDevice);
      this.setStatus("ready", null);
      sails.log.debug(`Notification manager > ${this.type}: ${badge}, ${message}, ${user}`);
      return true;
    } catch (error) {
      this.setStatus("error", String(error));
      sails.log.error(`Failed to send message via ${this.type}. Error: ${error}`);
      sails.log.warn(`✉️ Notification manager > console: ${badge}, ${message}, ${user}`)
      return false;
    }
  }

  /**
   * Optional: check delivery status using the messageId returned from send().
   * Returns null if the channel does not support delivery checks.
   */
  public async checkDelivery(messageId: string): Promise<DeliveryStatus | null> {
    return null;
  }
}

export class NotificationManager {
  public static readonly channelsStateSettingKey = NOTIFICATION_CHANNELS_STATE_SETTING_KEY;
  private static channelsStateSettingsListenerBound = false;
  private static channelsStateSettingDeclared = false;

  private static getSettingsModel(): typeof Settings | null {
    try {
      if (typeof Settings !== "undefined") {
        return Settings;
      }
    } catch (error) {
      // Settings is a Sails global and can be unavailable during early imports.
    }
    return null;
  }

  private static declareChannelsStateSetting(): void {
    const settingsModel = NotificationManager.getSettingsModel();
    if (!settingsModel || NotificationManager.channelsStateSettingDeclared) return;

    if (typeof settingsModel.setDeclaredSetting === "function") {
      settingsModel.setDeclaredSetting(NOTIFICATION_CHANNELS_STATE_SETTING_KEY);
    }
    NotificationManager.channelsStateSettingDeclared = true;
  }

  private static normalizeChannelsState(value: unknown): ChannelManagerStateMap {
    if (!value || typeof value !== "object" || Array.isArray(value)) return {};

    return Object.entries(value as Record<string, unknown>).reduce<ChannelManagerStateMap>((state, [type, raw]) => {
      if (!type || !raw || typeof raw !== "object" || Array.isArray(raw)) return state;

      const enabled = (raw as ChannelManagerState).enabled;
      const sortOrder = Number((raw as ChannelManagerState).sortOrder);
      const cost = Number((raw as ChannelManagerState).cost);
      state[type] = {
        ...(typeof enabled === "boolean" ? { enabled } : {}),
        ...(Number.isFinite(sortOrder) ? { sortOrder } : {}),
        ...(Number.isFinite(cost) ? { cost } : {}),
      };
      return state;
    }, {});
  }

  private static applyChannelsState(state: ChannelManagerStateMap): void {
    for (const channel of NotificationManager.channels) {
      const channelState = state[channel.type];
      if (!channelState) continue;
      if (typeof channelState.enabled === "boolean") channel.setEnabled(channelState.enabled);
      if (Number.isFinite(channelState.sortOrder)) channel.setSortOrder(Number(channelState.sortOrder));
      if (Number.isFinite(channelState.cost)) channel.setCost(Number(channelState.cost));
    }
    NotificationManager.sortChannels();
  }

  private static getCurrentChannelsState(previousState: ChannelManagerStateMap = {}): ChannelManagerStateMap {
    const state: ChannelManagerStateMap = { ...previousState };
    for (const channel of NotificationManager.channels) {
      state[channel.type] = {
        ...(state[channel.type] || {}),
        enabled: channel.isEnabled(),
        sortOrder: channel.sortOrder,
        cost: channel.cost,
      };
    }
    return state;
  }

  private static sortChannels(): void {
    NotificationManager.channels.sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
      return a.cost - b.cost;
    });
  }

  private static ensureChannelsStateSettingsListener(): void {
    if (NotificationManager.channelsStateSettingsListenerBound) return;

    try {
      if (typeof emitter === "undefined") return;
      emitter.on(`settings:${NOTIFICATION_CHANNELS_STATE_SETTING_KEY}`, "notification-manager-channels-state", (record: any) => {
        const state = NotificationManager.normalizeChannelsState(record?.value ?? record?.defaultValue ?? {});
        NotificationManager.applyChannelsState(state);
      });
      NotificationManager.channelsStateSettingsListenerBound = true;
    } catch (error) {
      sails.log.silly(`[NotificationManager] Unable to subscribe to channels state setting`, error);
    }
  }

  public static async loadChannelsState(): Promise<void> {
    const settingsModel = NotificationManager.getSettingsModel();
    if (!settingsModel) return;

    NotificationManager.declareChannelsStateSetting();
    NotificationManager.ensureChannelsStateSettingsListener();

    const value = await settingsModel.get(NOTIFICATION_CHANNELS_STATE_SETTING_KEY);
    if (value === undefined) {
      await NotificationManager.saveChannelsState();
      return;
    }
    NotificationManager.applyChannelsState(NotificationManager.normalizeChannelsState(value));
  }

  public static async saveChannelsState(): Promise<void> {
    const settingsModel = NotificationManager.getSettingsModel();
    if (!settingsModel) return;

    NotificationManager.declareChannelsStateSetting();
    NotificationManager.ensureChannelsStateSettingsListener();

    const existingState = NotificationManager.normalizeChannelsState(
      await settingsModel.get(NOTIFICATION_CHANNELS_STATE_SETTING_KEY)
    );
    const state = NotificationManager.getCurrentChannelsState(existingState);

    await settingsModel.set(NOTIFICATION_CHANNELS_STATE_SETTING_KEY, {
      ...NOTIFICATION_CHANNELS_STATE_SETTING,
      value: state,
    });
  }

  public static async setChannelEnabled(channelType: string, enabled: boolean): Promise<Channel | null> {
    return NotificationManager.setChannelSettings(channelType, { enabled });
  }

  public static async setChannelSettings(channelType: string, settings: ChannelSettingsUpdate): Promise<Channel | null> {
    const channel = NotificationManager.channels.find((item) => item.type === channelType);
    if (!channel) return null;

    if (typeof settings.enabled === "boolean") channel.setEnabled(settings.enabled);
    if (Number.isFinite(settings.sortOrder)) channel.setSortOrder(Number(settings.sortOrder));
    if (Number.isFinite(settings.cost)) channel.setCost(Number(settings.cost));

    NotificationManager.sortChannels();
    await NotificationManager.saveChannelsState();
    return channel;
  }

  public static async sendMessageToDeliveryManager(badge: Badge, text: string): Promise<void> {
    // I apologize what delivery message channel is direct to manager, its reason to null user. Time will show
    try {
      await NotificationManager.send(badge, "manager", text, null);
    } catch (error) {
      sails.log.error(`Failed to send message to delivery manager. Error: ${error}`);
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

  public static readonly channels: Channel[] = getSharedChannelsRegistry();

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
      if (!channel.forGroupTo.includes(groupTo)) continue;
      if (channelType && channel.type !== channelType) continue;
      if (!channel.isEnabled()) continue;

      if (!(await channel.isConfigured())) {
        sails.log.verbose(`[NotificationManager] Channel ${channel.type} not configured, skipping`);
        continue;
      }

      if (!(await channel.isReady())) {
        sails.log.verbose(`[NotificationManager] Channel ${channel.type} not ready, skipping`);
        continue;
      }

      const ok = await channel.trySendMessage(badge, message, user, subject, data);

      if (ok) {
        sent = true;
        if (channel.forceSend !== true) break;
        // forceSend -> continue, e.g. audit channel.
      }
      // Failure -> continue automatically and move to the next channel.
    }

    if (!sent) {
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
    NotificationManager.sortChannels();
    NotificationManager.ensureChannelsStateSettingsListener();
    void NotificationManager.loadChannelsState();
  };
}
