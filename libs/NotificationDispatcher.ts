import { NotificationRecord, NotificationChannelEntry } from "../models/Notification";
import { UserDeviceRecord } from "../models/UserDevice";
import { UserRecord } from "../models/User";
import { NotificationManager } from "./NotificationManager";
import { ObservablePromise } from "./ObservablePromise";

// Alias to avoid conflict with the browser-global Notification type
declare const Notification: {
  create(values: Partial<NotificationRecord>): { fetch(): Promise<NotificationRecord> };
  updateOne(criteria: object): { set(values: Partial<NotificationRecord>): Promise<NotificationRecord> };
  find(criteria: object): Promise<NotificationRecord[]>;
  log: (criteria: { id: string }, level: string, module: string, message: string, ...data: any[]) => Promise<void>;
};

/**
 * Options for NotificationDispatcher.send. Replaces the previous positional argument list.
 * The first block is the legacy delivery payload; the second block carries typed-notification
 * metadata (notification type / event / per-type budget / scheduled delay) produced by
 * NotificationService.
 */
export interface NotificationSendOptions {
  user?: UserRecord | string | null;
  title: string;
  body: string;
  data?: object | null;
  badge?: "info" | "error";
  priorityDevice?: UserDeviceRecord;
  /** Overrides the auto-detected target group (defaults to "user" when user/device present). */
  groupTo?: "user" | "manager";
  channelTypes?: string[];
  important?: boolean;
  priorityDeviceOnly?: boolean;

  // ─── Typed-notification metadata ───
  notificationTypeKey?: string | null;
  eventKey?: string | null;
  context?: object | null;
  /** Per-message delivery budget; takes priority over the global fallback. null = use global. */
  maxDeliveryCost?: number | null;
  /** Earliest delivery time (ms). When in the future, delivery is deferred to the loop. */
  scheduledAt?: number | null;
  idempotencyKey?: string | null;
}

/**
 * Resolve the recipient locale for template selection (notifications §11.2):
 * context.recipient.locale → user.locale → DEFAULT_LOCALE setting → "en".
 * For a device-targeted send without a bound user (guest cart, push by order.deviceId)
 * the locale comes from the notification context (recipient.locale), filled at emit time.
 */
async function resolveNotificationLocale(notification: NotificationRecord): Promise<string> {
  const ctx = (notification.context || (notification.data as any)?.context) as any;
  const fromContext = ctx?.recipient?.locale || (notification.data as any)?.recipient?.locale;
  if (fromContext) return String(fromContext);
  const user = notification.user;
  if (user && typeof user === "object" && (user as any).locale) return String((user as any).locale);
  try {
    const def = await Settings.get("DEFAULT_LOCALE");
    if (def) return String(def);
  } catch (_error) { /* Settings may be unavailable */ }
  return "en";
}

/**
 * Pick channel-specific title/body from the pre-rendered `data.render` block
 * (channels[type] → locales[locale] → default), falling back to the notification's
 * own title/body when no render block is present (e.g. manual admin sends).
 */
function resolveChannelContent(notification: NotificationRecord, channelType: string, locale: string): { title: string; body: string } {
  const fallback = { title: notification.title || "", body: notification.body || "" };
  const render = (notification.data as any)?.render;
  if (!render || typeof render !== "object") return fallback;

  const pick = (entry: any): { title: string; body: string } | null => {
    if (!entry || typeof entry !== "object") return null;
    if (!entry.title && !entry.body) return null;
    return {
      title: entry.title != null ? String(entry.title) : fallback.title,
      body: entry.body != null ? String(entry.body) : fallback.body,
    };
  };

  return pick(render.channels?.[channelType])
    || pick(render.locales?.[locale])
    || pick(render.default)
    || fallback;
}

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
   * Creates a Notification record and attempts delivery — immediately, or, when
   * `scheduledAt` is in the future (sendDelaySec), deferred to the delivery loop.
   */
  static async send(options: NotificationSendOptions): Promise<NotificationRecord> {
    const {
      user = null,
      title,
      body,
      data = null,
      badge = "info",
      priorityDevice,
      groupTo: groupToOverride,
      channelTypes,
      important = false,
      priorityDeviceOnly = false,
      notificationTypeKey = null,
      eventKey = null,
      context = null,
      maxDeliveryCost = null,
      scheduledAt = null,
      idempotencyKey = null,
    } = options;

    // priorityDevice без user — это адресная доставка на конкретное устройство
    // (напр. уведомление по гостевой корзине через order.deviceId), а не manager-broadcast
    const groupTo = groupToOverride || (user || priorityDevice ? "user" : "manager");
    const requestedChannels = !priorityDeviceOnly && Array.isArray(channelTypes)
      ? Array.from(new Set(channelTypes.map((item) => String(item || "").trim()).filter(Boolean)))
      : [];

    const normalizedMaxCost = maxDeliveryCost === null || maxDeliveryCost === undefined ? null : Number(maxDeliveryCost);
    const normalizedScheduledAt = scheduledAt === null || scheduledAt === undefined ? null : Number(scheduledAt);

    const notificationValues: Partial<NotificationRecord> = {
      user: user ? (typeof user === "string" ? user : (user as any).id) : null,
      title,
      body,
      data: data || null,
      badge,
      groupTo,
      status: "pending",
      important: Boolean(important),
      notificationTypeKey: notificationTypeKey || null,
      eventKey: eventKey || null,
      context: context || null,
      maxDeliveryCost: normalizedMaxCost !== null && Number.isFinite(normalizedMaxCost) ? normalizedMaxCost : null,
      scheduledAt: normalizedScheduledAt !== null && Number.isFinite(normalizedScheduledAt) ? normalizedScheduledAt : null,
      idempotencyKey: idempotencyKey || null,
    };
    if (requestedChannels.length > 0) {
      notificationValues.requestedChannels = requestedChannels;
    }
    const notification = await Notification.create(notificationValues).fetch();
    await Notification.log(
      { id: notification.id! },
      "info",
      "delivery",
      `Notification created for delivery: group=${groupTo}, type=${notificationTypeKey || "none"}, event=${eventKey || "none"}, requestedChannels=${requestedChannels.join(",") || "none"}, priorityDeviceOnly=${priorityDeviceOnly}, priorityDevice=${priorityDevice?.id || "none"}, maxDeliveryCost=${notificationValues.maxDeliveryCost === null ? "global fallback" : notificationValues.maxDeliveryCost}, scheduledAt=${notificationValues.scheduledAt ? new Date(notificationValues.scheduledAt).toISOString() : "now"}`
    );

    const deferred = notificationValues.scheduledAt !== null && (notificationValues.scheduledAt as number) > Date.now();
    if (deferred) {
      await Notification.log(
        { id: notification.id! },
        "info",
        "delivery",
        `Delivery deferred until ${new Date(notificationValues.scheduledAt as number).toISOString()} (sendDelaySec); delivery loop will pick it up`
      );
    } else {
      await NotificationDispatcher._deliver(notification, priorityDevice, channelTypes, priorityDeviceOnly);
    }

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

    // Отменённые уведомления (напр. догонка по уже завершённому заказу) не доставляем.
    if (notification.status === "cancelled") {
      await Notification.log({ id: notification.id! }, "info", "delivery", "Delivery skipped: notification was cancelled");
      return;
    }

    // Запланированная доставка ещё не наступила (sendDelaySec) — отдаём loop'у на следующий тик.
    if (notification.scheduledAt && Number(notification.scheduledAt) > Date.now()) {
      await Notification.log({ id: notification.id! }, "info", "delivery", `Delivery skipped: scheduled for ${new Date(Number(notification.scheduledAt)).toISOString()} (not due yet)`);
      return;
    }

    await Notification.log(
      { id: notification.id! },
      "info",
      "delivery",
      `Delivery processor started: group=${groupTo}, type=${notification.notificationTypeKey || "none"}, priorityDevice=${priorityDevice?.id || "none"}, priorityDeviceOnly=${priorityDeviceOnly}, channelTypes=${Array.isArray(channelTypes) ? channelTypes.join(",") || "empty" : "auto"}, important=${Boolean(notification.important)}`
    );

    // Локаль получателя для выбора channel-specific/локализованного шаблона.
    // Для адресной доставки/гостевой корзины язык берётся из context.recipient.locale.
    const locale = await resolveNotificationLocale(notification);

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
          const content = resolveChannelContent(notification, priorityChannel.type, locale);
          const ok = await priorityChannel.trySendMessage(
            notification.badge,
            content.body,
            null as any,
            content.title,
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

    // Бюджет: per-type maxDeliveryCost имеет приоритет над глобальным fallback (design notes §3).
    const perMessageCost = notification.maxDeliveryCost ?? null;
    const maxCost: number | null = perMessageCost !== null
      ? Number(perMessageCost)
      : ((await Settings.get("NOTIFICATION_MAX_COST_PER_MESSAGE")) ?? null);
    const maxCostSource = perMessageCost !== null ? "notification type" : "global fallback";
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
      `Waterfall settings: maxAllowedCost=${maxCost === null ? "one paid channel" : maxCost} (${maxCostSource}), maxChannels=${maxChannels}, limitChannels=${limitChannels}, allowedChannelTypes=${allowedChannelTypes ? Array.from(allowedChannelTypes).join(",") || "empty" : "all"}`
    );

    let spentCost = 0;
    let budgetSkips = 0;

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
          const content = resolveChannelContent(notification, priorityChannel.type, locale);
          const ok = await priorityChannel.trySendMessage(
            notification.badge,
            content.body,
            notification.user as any,
            content.title,
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
        budgetSkips += 1;
        await Notification.log({ id: notification.id! }, "info", "delivery", `Skipped by budget: channelType=${channel.type}, spentCost=${spentCost}, channelCost=${channel.cost}, maxAllowedCost=${maxCost === null ? "one paid channel" : maxCost}`);
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

      const content = resolveChannelContent(notification, channel.type, locale);
      const ok = await channel.trySendMessage(
        notification.badge,
        content.body,
        notification.user as any,
        content.title,
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

    // Финальная запись причины, если водопад пропускал каналы из-за бюджета.
    if (budgetSkips > 0) {
      await Notification.log(
        { id: notification.id! },
        "info",
        "delivery",
        `Waterfall stopped/limited by budget: ${budgetSkips} channel(s) skipped by budget, spentCost=${spentCost}, maxAllowedCost=${maxCost === null ? "one paid channel" : maxCost} (${maxCostSource})`
      );
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
      const now = Date.now();
      // Доставляем только pending, у которых наступило время (scheduledAt в прошлом/не задан).
      // Запланированные на будущее (sendDelaySec) и отменённые пропускаем.
      const pending = await Notification.find({
        status: "pending",
        or: [
          { scheduledAt: null },
          { scheduledAt: { "<=": now } },
        ],
      });
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

    // Если оператор явно выбрал каналы доставки, эскалация идёт строго в их пределах:
    // перебираем следующий ещё не использованный канал из выбранных, не выходя за список (§11.1).
    const allowedChannelTypes = Array.isArray(notification.requestedChannels) && notification.requestedChannels.length > 0
      ? new Set(notification.requestedChannels.map((item) => String(item)))
      : null;

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
    // Бюджет: per-type maxDeliveryCost имеет приоритет над глобальным fallback (design notes §3).
    const perMessageCost = notification.maxDeliveryCost ?? null;
    const maxCost: number | null = perMessageCost !== null
      ? Number(perMessageCost)
      : ((await Settings.get("NOTIFICATION_MAX_COST_PER_MESSAGE")) ?? null);
    const maxCostSource = perMessageCost !== null ? "notification type" : "global fallback";
    const locale = await resolveNotificationLocale(notification);
    let spentCost: number = notification.spentCost ?? 0;
    let budgetSkips = 0;
    await Notification.log(
      { id: notification.id! },
      "info",
      "escalation",
      `Escalation settings: usedChannels=${Array.from(usedTypes).join(",") || "none"}, spentCost=${spentCost}, maxAllowedCost=${maxCost === null ? "one paid channel" : maxCost} (${maxCostSource}), maxChannels=${maxChannels}, attempts=${attempts}, allowedChannelTypes=${allowedChannelTypes ? Array.from(allowedChannelTypes).join(",") || "empty" : "all"}`
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
      if (allowedChannelTypes && !allowedChannelTypes.has(channel.type)) {
        await Notification.log({ id: notification.id! }, "info", "escalation", `Skipping escalation channel ${channel.type}: not in requested channels`);
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
        budgetSkips += 1;
        await Notification.log({ id: notification.id! }, "info", "escalation", `Skipped by budget: channelType=${channel.type}, spentCost=${spentCost}, channelCost=${channel.cost}, maxAllowedCost=${maxCost === null ? "one paid channel" : maxCost}`);
        continue;
      }

      // Учитываем лимит и внутри перебора (на случай нескольких подходящих каналов).
      if (!notification.important && maxChannels > 0 && !channel.forceSend && attempts >= maxChannels) {
        await Notification.log({ id: notification.id! }, "info", "escalation", `Escalation channel limit reached (${attempts}/${maxChannels}), stopping`);
        break;
      }

      if (!channel.forceSend) attempts += 1;
      await Notification.log({ id: notification.id! }, "info", "escalation", `Attempting escalation via channel ${channel.type}, attempts=${attempts}`);
      const content = resolveChannelContent(notification, channel.type, locale);
      const ok = await channel.trySendMessage(
        notification.badge,
        content.body,
        notification.user as any,
        content.title,
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

    // Финальная запись причины, если эскалация пропускала каналы из-за бюджета.
    if (budgetSkips > 0) {
      await Notification.log(
        { id: notification.id! },
        "info",
        "escalation",
        `Escalation stopped/limited by budget: ${budgetSkips} channel(s) skipped by budget, spentCost=${spentCost}, maxAllowedCost=${maxCost === null ? "one paid channel" : maxCost} (${maxCostSource})`
      );
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
