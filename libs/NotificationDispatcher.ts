import { NotificationRecord } from "../models/Notification";
import { UserDeviceRecord } from "../models/UserDevice";
import { NotificationManager } from "./NotificationManager";
import { ObservablePromise } from "./ObservablePromise";

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
    priorityDevice?: UserDeviceRecord
  ): Promise<void> {
    const groupTo = user ? "user" : "manager";
    const notification = await Notification.create({
      user: user ? (typeof user === "string" ? user : user.id) : null,
      title,
      body,
      data: data || null,
      badge,
      groupTo,
      status: "pending",
    }).fetch();

    await NotificationDispatcher._deliver(notification, priorityDevice);

    // Emitter — только для наблюдателей (WebSocket, логи, аналитика)
    // Потеря события при рестарте не критична
    await emitter.emit("core:notification-created", notification);
  }

  /**
   * Internal delivery method. Called both on send() and on recovery/retry.
   * priorityDevice is not stored in DB — not available on recovery.
   */
  static async _deliver(notification: NotificationRecord, priorityDevice?: UserDeviceRecord): Promise<void> {
    const successChannels: string[] = [];
    const { groupTo } = notification;

    // Если передан priorityDevice — ищем канал под его провайдера, пробуем первым
    if (priorityDevice?.notificationToken) {
      const provider = (priorityDevice.notificationToken as any).provider;
      const priorityChannel = NotificationManager.channels.find(
        (ch) => ch.type === provider && ch.forGroupTo.includes(groupTo)
      );
      if (priorityChannel && (await priorityChannel.isReady())) {
        const ok = await priorityChannel.trySendMessage(
          notification.badge,
          notification.body,
          notification.user as any,
          notification.title,
          notification.data as any,
          priorityDevice
        );
        if (ok) {
          await Notification.updateOne({ id: notification.id }).set({
            status: "sent",
            channels: [priorityChannel.type],
          });
          return;
        }
      }
    }

    for (const channel of NotificationManager.channels) {
      if (!channel.forGroupTo.includes(groupTo)) continue;
      if (!(await channel.isReady())) continue;

      const ok = await channel.trySendMessage(
        notification.badge,
        notification.body,
        notification.user as any,
        notification.title,
        notification.data as any,
        priorityDevice
      );

      if (ok) {
        successChannels.push(channel.type);
        if (channel.forceSend !== true) break;
      }
    }

    await Notification.updateOne({ id: notification.id }).set({
      status: successChannels.length > 0 ? "sent" : "failed",
      channels: successChannels,
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
    const { groupTo, channels: usedChannels = [] } = notification;

    for (const channel of NotificationManager.channels) {
      if (!channel.forGroupTo.includes(groupTo)) continue;
      if ((usedChannels as string[]).includes(channel.type)) continue;
      if (!(await channel.isReady())) continue;

      const ok = await channel.trySendMessage(
        notification.badge,
        notification.body,
        notification.user as any,
        notification.title,
        notification.data as any
      );

      if (ok) {
        await Notification.updateOne({ id: notification.id }).set({
          channels: [...(usedChannels as string[]), channel.type],
          // статус остаётся 'sent' — read подтверждает только фронт
        });
        await Notification.log({ id: notification.id }, "info", "escalation", `Escalated to channel ${channel.type}`);
        break;
      }
    }
  }
}
