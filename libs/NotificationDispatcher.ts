import { NotificationRecord, NotificationChannelEntry } from "../models/Notification";
import { UserDeviceRecord } from "../models/UserDevice";
import { NotificationManager } from "./NotificationManager";
import { ObservablePromise } from "./ObservablePromise";

// Alias to avoid conflict with the browser-global Notification type
declare const Notification: {
  create(values: Partial<NotificationRecord>): { fetch(): Promise<NotificationRecord> };
  updateOne(criteria: object): { set(values: Partial<NotificationRecord>): Promise<NotificationRecord> };
  find(criteria: object): Promise<NotificationRecord[]>;
  log: (criteria: { id: string }, level: string, module: string, message: string, ...data: any[]) => Promise<void>;
};

function normalizeDeviceNotificationToken(device?: UserDeviceRecord): any | null {
  if (!device?.notificationToken) return null;

  let token = device.notificationToken as any;
  if (typeof token === "string") {
    try {
      token = JSON.parse(token);
    } catch (_error) {
      return null;
    }
  }

  device.notificationToken = token;
  return token && typeof token === "object" ? token : null;
}

function getPriorityDeviceChannelTypes(device?: UserDeviceRecord): string[] {
  const token = normalizeDeviceNotificationToken(device);
  if (!token) return [];

  const provider = String(token.provider || "").trim().toLowerCase();
  const platform = String(token.platform || "").trim().toLowerCase();

  if (provider === "fcm") {
    if (platform === "web") return ["fcm-web"];
    if (platform === "ios" || platform === "android") return ["fcm-mobile"];
  }

  return provider ? [provider] : [];
}

export class NotificationDispatcher {

  /**
   * Send a notification to a user (or manager if user is null).
   * Creates a Notification record and immediately attempts delivery.
   */
  static async send(
    user: any | string | null,
    title: string,
    body: string,
    data?: object,
    badge: "info" | "error" = "info",
    priorityDevice?: UserDeviceRecord,
    groupToOverride?: "user" | "manager",
    channelTypes?: string[],
    important: boolean = false,
    priorityDeviceOnly: boolean = false
  ): Promise<NotificationRecord> {
    // priorityDevice без user — это адресная доставка на конкретное устройство
    // (напр. уведомление по гостевой корзине через order.deviceId), а не manager-broadcast
    const groupTo = groupToOverride || (user || priorityDevice ? "user" : "manager");
    const requestedChannels = !priorityDeviceOnly && Array.isArray(channelTypes)
      ? Array.from(new Set(channelTypes.map((item) => String(item || "").trim()).filter(Boolean)))
      : [];
    const notificationValues: Partial<NotificationRecord> = {
      user: user ? (typeof user === "string" ? user : user.id) : null,
      title,
      body,
      data: data || null,
      badge,
      groupTo,
      status: "pending",
      important: Boolean(important),
    };
    if (requestedChannels.length > 0) {
      notificationValues.requestedChannels = requestedChannels;
    }
    const notification = await Notification.create(notificationValues).fetch();
    await Notification.log(
      { id: notification.id! },
      "info",
      "delivery",
      `Notification created for delivery: group=${groupTo}, requestedChannels=${requestedChannels.join(",") || "none"}, priorityDeviceOnly=${priorityDeviceOnly}, priorityDevice=${priorityDevice?.id || "none"}`
    );

    await NotificationDispatcher._deliver(notification, priorityDevice, channelTypes, priorityDeviceOnly);

    // Emitter — только для наблюдателей (WebSocket, логи, аналитика)
    // Потеря события при рестарте не критична
    await emitter.emit("core:notification-created", notification);

    const updatedNotification = await (globalThis as any).Notification.findOne({ id: notification.id! });
    return (updatedNotification || notification) as NotificationRecord;
  }

  /**
   * Internal delivery method. Called both on send() and on recovery/retry.
   * priorityDevice is not stored in DB — not available on recovery.
   */
  static async _deliver(notification: NotificationRecord, priorityDevice?: UserDeviceRecord, channelTypes?: string[], priorityDeviceOnly: boolean = false): Promise<void> {
    const successChannels: NotificationChannelEntry[] = [];
    const { groupTo } = notification;
    await Notification.log(
      { id: notification.id! },
      "info",
      "delivery",
      `Delivery processor started: group=${groupTo}, priorityDevice=${priorityDevice?.id || "none"}, priorityDeviceOnly=${priorityDeviceOnly}, channelTypes=${Array.isArray(channelTypes) ? channelTypes.join(",") || "empty" : "auto"}, important=${Boolean(notification.important)}`
    );

    // notification.user приходит из БД как id-строка; каналам нужен объект с .id.
    // Популируем здесь, чтобы и обычная (recovery/retry), и device-доставка работали единообразно.
    if (notification.user && typeof notification.user === "string") {
      await Notification.log({ id: notification.id! }, "info", "delivery", `Resolving notification user ${notification.user}`);
      const populatedUser = await User.findOne({ id: notification.user });
      if (populatedUser) {
        notification.user = populatedUser as any;
        await Notification.log({ id: notification.id! }, "info", "delivery", `Resolved notification user ${populatedUser.id}`);
      } else {
        await Notification.log({ id: notification.id! }, "warn", "delivery", "Notification user was not found, channels will receive the raw user value");
      }
    }

    let attempts = Number(notification.deliveryAttempts) || 0;
    await Notification.log({ id: notification.id! }, "info", "delivery", `Initial delivery attempts: ${attempts}`);

    // priorityDeviceOnly — адресная доставка только на выбранный UserDevice:
    // каналы из формы игнорируются, fallback/waterfall по другим каналам запрещён.
    if (priorityDeviceOnly) {
      const priorityChannelTypes = getPriorityDeviceChannelTypes(priorityDevice);
      const token = normalizeDeviceNotificationToken(priorityDevice);
      await Notification.log(
        { id: notification.id! },
        "info",
        "delivery",
        `Priority-device-only mode: token provider=${token?.provider || "unknown"}, platform=${token?.platform || "unknown"}, candidateChannels=${priorityChannelTypes.join(",") || "none"}`
      );
      const priorityChannel = NotificationManager.channels.find(
        (ch) => priorityChannelTypes.includes(ch.type) && ch.forGroupTo.includes(groupTo)
      );

      if (!priorityChannel) {
        await Notification.log({ id: notification.id! }, "error", "delivery", `Priority device delivery failed: no registered channel matched ${priorityChannelTypes.join(", ") || "unknown"}`);
      } else {
        await Notification.log({ id: notification.id! }, "info", "delivery", `Priority device channel candidate: ${priorityChannel.type}`);
      }

      if (priorityChannel) {
        const enabled = priorityChannel.isEnabled();
        await Notification.log({ id: notification.id! }, enabled ? "info" : "warn", "delivery", `Priority device channel ${priorityChannel.type} enabled=${enabled}`);
        const configured = enabled ? await priorityChannel.isConfigured() : false;
        await Notification.log({ id: notification.id! }, configured ? "info" : "warn", "delivery", `Priority device channel ${priorityChannel.type} configured=${configured}`);
        const ready = configured ? await priorityChannel.isReady() : false;
        await Notification.log({ id: notification.id! }, ready ? "info" : "warn", "delivery", `Priority device channel ${priorityChannel.type} ready=${ready}`);

        if (enabled && configured && ready) {
          await Notification.log({ id: notification.id! }, "info", "delivery", `Attempting priority-device-only delivery via ${priorityChannel.type}`);
          attempts += 1;
          await Notification.log({ id: notification.id! }, "info", "delivery", `Delivery attempts incremented to ${attempts}`);
          const ok = await priorityChannel.trySendMessage(
            notification.badge,
            notification.body,
            null as any,
            notification.title,
            notification.data as any,
            priorityDevice
          );
          if (ok) {
            await Notification.log({ id: notification.id! }, "info", "delivery", `Delivered to priority device via ${priorityChannel.type}`);
            await Notification.updateOne({ id: notification.id }).set({
              status: "sent",
              channels: [{ type: priorityChannel.type, cost: 0, sentAt: Date.now() }],
              spentCost: 0,
              deliveryAttempts: attempts,
            });
            await Notification.log({ id: notification.id! }, "info", "delivery", `Priority-device-only delivery finished as sent, attempts=${attempts}`);
            return;
          }
          await Notification.log({ id: notification.id! }, "warn", "delivery", `Priority device channel ${priorityChannel.type} failed to send: ${priorityChannel.error || "unknown error"}`);
        }
      }

      await Notification.updateOne({ id: notification.id }).set({
        status: "failed",
        channels: [],
        spentCost: 0,
        deliveryAttempts: attempts,
      });
      await Notification.log({ id: notification.id! }, "error", "delivery", `Priority-device-only delivery finished as failed, attempts=${attempts}`);
      return;
    }

    const maxCost: number | null = (await Settings.get("NOTIFICATION_MAX_COST_PER_MESSAGE")) ?? null;
    const allowedChannelTypes = Array.isArray(channelTypes) && channelTypes.length > 0
      ? new Set(channelTypes.map((item) => String(item)))
      : null;

    // Лимит каналов водопада: сколько каналов (успех+неудача) пробуем максимум.
    // Важные уведомления (important) не ограничиваем.
    const maxChannels: number = (await Settings.get("NOTIFICATION_MAX_CHANNELS_PER_MESSAGE")) ?? 3;
    const limitChannels = !notification.important && maxChannels > 0;
    await Notification.log(
      { id: notification.id! },
      "info",
      "delivery",
      `Waterfall settings: maxCost=${maxCost === null ? "one paid channel" : maxCost}, maxChannels=${maxChannels}, limitChannels=${limitChannels}, allowedChannelTypes=${allowedChannelTypes ? Array.from(allowedChannelTypes).join(",") || "empty" : "all"}`
    );

    let spentCost = 0;

    const isCostAllowed = (cost: number): boolean => {
      if (cost === 0) return true;
      if (maxCost !== null) return spentCost + cost <= maxCost;
      // maxCost not set: allow only one paid channel per delivery
      return spentCost === 0;
    };

    // Если передан priorityDevice — ищем канал под его провайдера, пробуем первым
    if (priorityDevice?.notificationToken) {
      const provider = (normalizeDeviceNotificationToken(priorityDevice) as any)?.provider;
      await Notification.log({ id: notification.id! }, "info", "delivery", `Priority device provided for regular delivery: provider=${provider || "unknown"}, device=${priorityDevice.id || "unknown"}`);
      const priorityChannel = NotificationManager.channels.find(
        (ch) => ch.type === provider && ch.forGroupTo.includes(groupTo)
      );
      if (!priorityChannel) {
        await Notification.log({ id: notification.id! }, "info", "delivery", `No priority channel found for provider ${provider || "unknown"}, switching to waterfall`);
      } else if (allowedChannelTypes && !allowedChannelTypes.has(priorityChannel.type)) {
        await Notification.log({ id: notification.id! }, "info", "delivery", `Priority channel ${priorityChannel.type} skipped: not in requested channels`);
      } else {
        const enabled = priorityChannel.isEnabled();
        await Notification.log({ id: notification.id! }, enabled ? "info" : "warn", "delivery", `Priority channel ${priorityChannel.type} enabled=${enabled}`);
        const configured = enabled ? await priorityChannel.isConfigured() : false;
        await Notification.log({ id: notification.id! }, configured ? "info" : "warn", "delivery", `Priority channel ${priorityChannel.type} configured=${configured}`);
        const ready = configured ? await priorityChannel.isReady() : false;
        await Notification.log({ id: notification.id! }, ready ? "info" : "warn", "delivery", `Priority channel ${priorityChannel.type} ready=${ready}`);
        if (enabled && configured && ready) {
          await Notification.log({ id: notification.id! }, "info", "delivery", `Attempting delivery via priority channel ${priorityChannel.type}`);
          attempts += 1;
          await Notification.log({ id: notification.id! }, "info", "delivery", `Delivery attempts incremented to ${attempts}`);
          const ok = await priorityChannel.trySendMessage(
            notification.badge,
            notification.body,
            notification.user as any,
            notification.title,
            notification.data as any,
            priorityDevice
          );
          if (ok) {
            const priorityCost = Number(priorityChannel.cost) || 0;
            await Notification.log({ id: notification.id! }, "info", "delivery", `Delivered via priority channel ${priorityChannel.type}, cost: ${priorityCost}`);
            await Notification.updateOne({ id: notification.id }).set({
              status: "sent",
              channels: [{ type: priorityChannel.type, cost: priorityCost, sentAt: Date.now() }],
              spentCost: priorityCost,
              deliveryAttempts: attempts,
            });
            await Notification.log({ id: notification.id! }, "info", "delivery", `Delivery processor finished as sent via priority channel, attempts=${attempts}, spentCost=${priorityCost}`);
            return;
          }
          await Notification.log({ id: notification.id! }, "warn", "delivery", `Priority channel ${priorityChannel.type} failed to send: ${priorityChannel.error || "unknown error"}`);
        }
      }
    }

    for (const channel of NotificationManager.channels) {
      await Notification.log({ id: notification.id! }, "info", "delivery", `Analyzing channel ${channel.type}: groups=${channel.forGroupTo.join(",")}, forceSend=${channel.forceSend}, sortOrder=${channel.sortOrder}, cost=${channel.cost}`);
      if (!channel.forGroupTo.includes(groupTo)) {
        await Notification.log({ id: notification.id! }, "info", "delivery", `Skipping channel ${channel.type}: group ${groupTo} is not supported`);
        continue;
      }
      if (allowedChannelTypes && !allowedChannelTypes.has(channel.type)) {
        await Notification.log({ id: notification.id! }, "info", "delivery", `Skipping channel ${channel.type}: not in requested channels`);
        continue;
      }
      if (!channel.isEnabled()) {
        await Notification.log({ id: notification.id! }, "info", "delivery", `Skipping channel ${channel.type}: disabled`);
        continue;
      }
      const configured = await channel.isConfigured();
      if (!configured) {
        await Notification.log({ id: notification.id! }, "info", "delivery", `Skipping channel ${channel.type}: not configured`);
        continue;
      }
      const ready = await channel.isReady();
      if (!ready) {
        await Notification.log({ id: notification.id! }, "info", "delivery", `Skipping channel ${channel.type}: not ready`);
        continue;
      }
      if (!channel.forceSend && !isCostAllowed(channel.cost)) {
        await Notification.log({ id: notification.id! }, "info", "delivery", `Skipping channel ${channel.type}: cost limit, spent=${spentCost}, channelCost=${channel.cost}, maxCost=${maxCost === null ? "one paid channel" : maxCost}`);
        continue;
      }

      // Лимит водопада: прекращаем пробовать новые каналы, исчерпав лимит попыток.
      // forceSend-каналы (напр. audit) не считаются и не ограничиваются.
      if (limitChannels && !channel.forceSend && attempts >= maxChannels) {
        await Notification.log({ id: notification.id! }, "info", "delivery", `Waterfall channel limit reached (${attempts}/${maxChannels}), stopping`);
        break;
      }

      await Notification.log({ id: notification.id! }, "info", "delivery", `Attempting delivery via channel ${channel.type}`);
      if (!channel.forceSend) attempts += 1;
      await Notification.log({ id: notification.id! }, "info", "delivery", `Delivery attempts incremented to ${attempts}`);

      const ok = await channel.trySendMessage(
        notification.badge,
        notification.body,
        notification.user as any,
        notification.title,
        notification.data as any,
        priorityDevice
      );

      if (ok) {
        const channelCost = Number(channel.cost) || 0;
        successChannels.push({ type: channel.type, cost: channelCost, sentAt: Date.now() });
        spentCost += channelCost;
        await Notification.log({ id: notification.id! }, "info", "delivery", `Delivered via channel ${channel.type}, cost: ${channelCost}`);
        if (channel.forceSend !== true) break;
      } else {
        await Notification.log({ id: notification.id! }, "warn", "delivery", `Channel ${channel.type} failed to send: ${channel.error || "unknown error"}`);
      }
    }

    if (successChannels.length === 0) {
      await Notification.log({ id: notification.id! }, "error", "delivery", "Notification was not sent: no channel delivered the message");
    }

    await Notification.updateOne({ id: notification.id }).set({
      status: successChannels.length > 0 ? "sent" : "failed",
      channels: successChannels,
      spentCost,
      deliveryAttempts: attempts,
    });
    await Notification.log({ id: notification.id! }, "info", "delivery", `Delivery processor finished: status=${successChannels.length > 0 ? "sent" : "failed"}, channels=${successChannels.map((channel) => channel.type).join(",") || "none"}, spentCost=${spentCost}, attempts=${attempts}`);
  }

  // ─── Delivery loop (retry pending) ───────────────────────────────────────

  private static deliverPendingPromise: ObservablePromise<void> | null = null;
  private static deliverPendingInterval: ReturnType<typeof setInterval> | null = null;

  static startDeliveryLoop(intervalSeconds: number = 60): void {
    if (NotificationDispatcher.deliverPendingInterval) {
      clearInterval(NotificationDispatcher.deliverPendingInterval);
    }

    // Первый запуск сразу при старте — подхватывает pending после рестарта
    NotificationDispatcher._deliverPending();

    NotificationDispatcher.deliverPendingInterval = setInterval(
      () => NotificationDispatcher._deliverPending(),
      intervalSeconds * 1000
    );
  }

  static async _deliverPending(): Promise<void> {
    if (NotificationDispatcher.deliverPendingPromise?.status === "pending") {
      return NotificationDispatcher.deliverPendingPromise.promise;
    }

    const promise = (async () => {
      const pending = await Notification.find({ status: "pending" });
      for (const notification of pending) {
        await NotificationDispatcher._deliver(notification);
      }
    })();

    NotificationDispatcher.deliverPendingPromise = new ObservablePromise(promise);
    return promise;
  }

  // ─── Escalation loop (retry sent-but-unread) ─────────────────────────────

  private static escalateSentPromise: ObservablePromise<void> | null = null;
  private static escalateSentInterval: ReturnType<typeof setInterval> | null = null;

  static startEscalationLoop(intervalSeconds: number = 60): void {
    if (NotificationDispatcher.escalateSentInterval) {
      clearInterval(NotificationDispatcher.escalateSentInterval);
    }

    NotificationDispatcher._escalateSent();

    NotificationDispatcher.escalateSentInterval = setInterval(
      () => NotificationDispatcher._escalateSent(),
      intervalSeconds * 1000
    );
  }

  static async _escalateSent(): Promise<void> {
    if (NotificationDispatcher.escalateSentPromise?.status === "pending") {
      return NotificationDispatcher.escalateSentPromise.promise;
    }

    const promise = (async () => {
      const timeoutMinutes = (await Settings.get("NOTIFICATION_UNREAD_ESCALATION_MINUTES")) ?? 5;
      const cutoff = Date.now() - timeoutMinutes * 60 * 1000;

      // sent-уведомления старше таймаута — пользователь не открыл, пробуем следующий канал
      const unread = await Notification.find({
        status: "sent",
        updatedAt: { "<": cutoff },
      });

      for (const notification of unread) {
        await NotificationDispatcher._deliverNextChannel(notification);
      }
    })();

    NotificationDispatcher.escalateSentPromise = new ObservablePromise(promise);
    return promise;
  }

  /**
   * Try the next available channel that hasn't been used yet (for escalation).
   */
  static async _deliverNextChannel(notification: NotificationRecord): Promise<void> {
    const { groupTo } = notification;
    await Notification.log({ id: notification.id! }, "info", "escalation", `Escalation processor started: group=${groupTo}, important=${Boolean(notification.important)}`);

    // Эскалация запрещена, если оператор явно выбрал каналы доставки:
    // уведомление должно уйти только по указанным каналам, без перебора остальных.
    if (Array.isArray(notification.requestedChannels) && notification.requestedChannels.length > 0) {
      await Notification.log({ id: notification.id! }, "info", "escalation", `Escalation skipped: requested channels are fixed (${notification.requestedChannels.join(",")})`);
      return;
    }

    // Лимит водопада: не эскалируем дальше, если исчерпан лимит каналов.
    // Важные уведомления (important) не ограничиваем.
    const maxChannels: number = (await Settings.get("NOTIFICATION_MAX_CHANNELS_PER_MESSAGE")) ?? 3;
    let attempts = Number(notification.deliveryAttempts) || 0;
    if (!notification.important && maxChannels > 0 && attempts >= maxChannels) {
      await Notification.log({ id: notification.id! }, "info", "escalation", `Escalation skipped: channel limit reached (${attempts}/${maxChannels})`);
      return;
    }

    const usedChannels: NotificationChannelEntry[] = Array.isArray(notification.channels) ? notification.channels : [];
    const usedTypes = new Set(usedChannels.map((e) => e.type));
    const maxCost: number | null = (await Settings.get("NOTIFICATION_MAX_COST_PER_MESSAGE")) ?? null;
    let spentCost: number = notification.spentCost ?? 0;
    await Notification.log(
      { id: notification.id! },
      "info",
      "escalation",
      `Escalation settings: usedChannels=${Array.from(usedTypes).join(",") || "none"}, spentCost=${spentCost}, maxCost=${maxCost === null ? "one paid channel" : maxCost}, maxChannels=${maxChannels}, attempts=${attempts}`
    );

    const isCostAllowed = (cost: number): boolean => {
      if (cost === 0) return true;
      if (maxCost !== null) return spentCost + cost <= maxCost;
      // maxCost not set: allow only one paid channel total
      return spentCost === 0;
    };

    for (const channel of NotificationManager.channels) {
      await Notification.log({ id: notification.id! }, "info", "escalation", `Analyzing escalation channel ${channel.type}: groups=${channel.forGroupTo.join(",")}, forceSend=${channel.forceSend}, sortOrder=${channel.sortOrder}, cost=${channel.cost}`);
      if (!channel.forGroupTo.includes(groupTo)) {
        await Notification.log({ id: notification.id! }, "info", "escalation", `Skipping escalation channel ${channel.type}: group ${groupTo} is not supported`);
        continue;
      }
      if (usedTypes.has(channel.type)) {
        await Notification.log({ id: notification.id! }, "info", "escalation", `Skipping escalation channel ${channel.type}: already used`);
        continue;
      }
      if (!channel.isEnabled()) {
        await Notification.log({ id: notification.id! }, "info", "escalation", `Skipping escalation channel ${channel.type}: disabled`);
        continue;
      }
      const configured = await channel.isConfigured();
      if (!configured) {
        await Notification.log({ id: notification.id! }, "info", "escalation", `Skipping escalation channel ${channel.type}: not configured`);
        continue;
      }
      const ready = await channel.isReady();
      if (!ready) {
        await Notification.log({ id: notification.id! }, "info", "escalation", `Skipping escalation channel ${channel.type}: not ready`);
        continue;
      }
      if (!channel.forceSend && !isCostAllowed(channel.cost)) {
        await Notification.log({ id: notification.id! }, "info", "escalation", `Skipping escalation channel ${channel.type}: cost limit, spent=${spentCost}, channelCost=${channel.cost}, maxCost=${maxCost === null ? "one paid channel" : maxCost}`);
        continue;
      }

      // Учитываем лимит и внутри перебора (на случай нескольких подходящих каналов).
      if (!notification.important && maxChannels > 0 && !channel.forceSend && attempts >= maxChannels) {
        await Notification.log({ id: notification.id! }, "info", "escalation", `Escalation channel limit reached (${attempts}/${maxChannels}), stopping`);
        break;
      }

      if (!channel.forceSend) attempts += 1;
      await Notification.log({ id: notification.id! }, "info", "escalation", `Attempting escalation via channel ${channel.type}, attempts=${attempts}`);
      const ok = await channel.trySendMessage(
        notification.badge,
        notification.body,
        notification.user as any,
        notification.title,
        notification.data as any
      );

      if (ok) {
        const channelCost = Number(channel.cost) || 0;
        spentCost += channelCost;
        const newEntry: NotificationChannelEntry = { type: channel.type, cost: channelCost, sentAt: Date.now() };
        await Notification.updateOne({ id: notification.id }).set({
          channels: [...usedChannels, newEntry],
          spentCost,
          deliveryAttempts: attempts,
          // статус остаётся 'sent' — read подтверждает только фронт
        });
        await Notification.log({ id: notification.id! }, "info", "escalation", `Escalated to channel ${channel.type}, total spent cost: ${spentCost}`);
        return;
      } else {
        await Notification.log({ id: notification.id! }, "warn", "escalation", `Escalation channel ${channel.type} failed to send: ${channel.error || "unknown error"}`);
      }
    }

    // Перебрали кандидатов без успеха — фиксируем израсходованные попытки,
    // чтобы лимит водопада соблюдался между тиками эскалации.
    if (attempts !== (Number(notification.deliveryAttempts) || 0)) {
      await Notification.updateOne({ id: notification.id }).set({ deliveryAttempts: attempts });
      await Notification.log({ id: notification.id! }, "info", "escalation", `Escalation finished without delivery, attempts updated to ${attempts}`);
    } else {
      await Notification.log({ id: notification.id! }, "info", "escalation", "Escalation finished without delivery and without new attempts");
    }
  }
}
