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
    important: boolean = false
  ): Promise<void> {
    // priorityDevice без user — это адресная доставка на конкретное устройство
    // (напр. уведомление по гостевой корзине через order.deviceId), а не manager-broadcast
    const groupTo = groupToOverride || (user || priorityDevice ? "user" : "manager");
    const requestedChannels = Array.isArray(channelTypes)
      ? Array.from(new Set(channelTypes.map((item) => String(item || "").trim()).filter(Boolean)))
      : [];
    const notification = await Notification.create({
      user: user ? (typeof user === "string" ? user : user.id) : null,
      title,
      body,
      data: data || null,
      badge,
      groupTo,
      status: "pending",
      requestedChannels,
      important: Boolean(important),
    }).fetch();

    await NotificationDispatcher._deliver(notification, priorityDevice, channelTypes);

    // Emitter — только для наблюдателей (WebSocket, логи, аналитика)
    // Потеря события при рестарте не критична
    await emitter.emit("core:notification-created", notification);
  }

  /**
   * Internal delivery method. Called both on send() and on recovery/retry.
   * priorityDevice is not stored in DB — not available on recovery.
   */
  static async _deliver(notification: NotificationRecord, priorityDevice?: UserDeviceRecord, channelTypes?: string[]): Promise<void> {
    const successChannels: NotificationChannelEntry[] = [];
    const { groupTo } = notification;

    // notification.user приходит из БД как id-строка; каналам нужен объект с .id.
    // Популируем здесь, чтобы и обычная (recovery/retry), и device-доставка работали единообразно.
    if (notification.user && typeof notification.user === "string") {
      const populatedUser = await User.findOne({ id: notification.user });
      if (populatedUser) notification.user = populatedUser as any;
    }

    const maxCost: number | null = (await Settings.get("NOTIFICATION_MAX_COST_PER_MESSAGE")) ?? null;
    const allowedChannelTypes = Array.isArray(channelTypes) && channelTypes.length > 0
      ? new Set(channelTypes.map((item) => String(item)))
      : null;

    // Лимит каналов водопада: сколько каналов (успех+неудача) пробуем максимум.
    // Важные уведомления (important) не ограничиваем.
    const maxChannels: number = (await Settings.get("NOTIFICATION_MAX_CHANNELS_PER_MESSAGE")) ?? 3;
    const limitChannels = !notification.important && maxChannels > 0;
    let attempts = Number(notification.deliveryAttempts) || 0;

    let spentCost = 0;

    const isCostAllowed = (cost: number): boolean => {
      if (cost === 0) return true;
      if (maxCost !== null) return spentCost + cost <= maxCost;
      // maxCost not set: allow only one paid channel per delivery
      return spentCost === 0;
    };

    // Если передан priorityDevice — ищем канал под его провайдера, пробуем первым
    if (priorityDevice?.notificationToken) {
      const provider = (priorityDevice.notificationToken as any).provider;
      const priorityChannel = NotificationManager.channels.find(
        (ch) => ch.type === provider && ch.forGroupTo.includes(groupTo)
      );
      if (
        priorityChannel &&
        (!allowedChannelTypes || allowedChannelTypes.has(priorityChannel.type)) &&
        priorityChannel.isEnabled() &&
        (await priorityChannel.isConfigured()) &&
        (await priorityChannel.isReady())
      ) {
        await Notification.log({ id: notification.id! }, "info", "delivery", `Attempting delivery via priority channel ${priorityChannel.type}`);
        attempts += 1;
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
          return;
        }
        await Notification.log({ id: notification.id! }, "warn", "delivery", `Priority channel ${priorityChannel.type} failed to send: ${priorityChannel.error || "unknown error"}`);
      }
    }

    for (const channel of NotificationManager.channels) {
      if (!channel.forGroupTo.includes(groupTo)) continue;
      if (allowedChannelTypes && !allowedChannelTypes.has(channel.type)) continue;
      if (!channel.isEnabled()) continue;
      if (!(await channel.isConfigured())) continue;
      if (!(await channel.isReady())) continue;
      if (!channel.forceSend && !isCostAllowed(channel.cost)) continue;

      // Лимит водопада: прекращаем пробовать новые каналы, исчерпав лимит попыток.
      // forceSend-каналы (напр. audit) не считаются и не ограничиваются.
      if (limitChannels && !channel.forceSend && attempts >= maxChannels) {
        await Notification.log({ id: notification.id! }, "info", "delivery", `Waterfall channel limit reached (${attempts}/${maxChannels}), stopping`);
        break;
      }

      await Notification.log({ id: notification.id! }, "info", "delivery", `Attempting delivery via channel ${channel.type}`);
      if (!channel.forceSend) attempts += 1;

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

    // Эскалация запрещена, если оператор явно выбрал каналы доставки:
    // уведомление должно уйти только по указанным каналам, без перебора остальных.
    if (Array.isArray(notification.requestedChannels) && notification.requestedChannels.length > 0) {
      return;
    }

    // Лимит водопада: не эскалируем дальше, если исчерпан лимит каналов.
    // Важные уведомления (important) не ограничиваем.
    const maxChannels: number = (await Settings.get("NOTIFICATION_MAX_CHANNELS_PER_MESSAGE")) ?? 3;
    let attempts = Number(notification.deliveryAttempts) || 0;
    if (!notification.important && maxChannels > 0 && attempts >= maxChannels) {
      return;
    }

    const usedChannels: NotificationChannelEntry[] = Array.isArray(notification.channels) ? notification.channels : [];
    const usedTypes = new Set(usedChannels.map((e) => e.type));
    const maxCost: number | null = (await Settings.get("NOTIFICATION_MAX_COST_PER_MESSAGE")) ?? null;
    let spentCost: number = notification.spentCost ?? 0;

    const isCostAllowed = (cost: number): boolean => {
      if (cost === 0) return true;
      if (maxCost !== null) return spentCost + cost <= maxCost;
      // maxCost not set: allow only one paid channel total
      return spentCost === 0;
    };

    for (const channel of NotificationManager.channels) {
      if (!channel.forGroupTo.includes(groupTo)) continue;
      if (usedTypes.has(channel.type)) continue;
      if (!channel.isEnabled()) continue;
      if (!(await channel.isConfigured())) continue;
      if (!(await channel.isReady())) continue;
      if (!channel.forceSend && !isCostAllowed(channel.cost)) continue;

      // Учитываем лимит и внутри перебора (на случай нескольких подходящих каналов).
      if (!notification.important && maxChannels > 0 && !channel.forceSend && attempts >= maxChannels) {
        break;
      }

      if (!channel.forceSend) attempts += 1;
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
    }
  }
}
