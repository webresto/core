import { NotificationRecord, NotificationChannelEntry } from "../models/Notification";
import { UserDeviceRecord } from "../models/UserDevice";
import { UserRecord } from "../models/User";
import { NotificationManager } from "./NotificationManager";
import { NotificationTypeRegistry } from "./NotificationTypeRegistry";
import { ObservablePromise } from "./ObservablePromise";

// Alias to avoid conflict with the browser-global Notification type
declare const Notification: {
  create(values: Partial<NotificationRecord>): { fetch(): Promise<NotificationRecord> };
  updateOne(criteria: object): { set(values: Partial<NotificationRecord>): Promise<NotificationRecord | undefined> };
  find(criteria: object): Promise<NotificationRecord[]>;
  log: (criteria: { id: string }, level: string, module: string, message: string, ...data: any[]) => Promise<void>;
};

/** A claimed delivery is considered abandoned (crashed process) after this long. */
const PROCESSING_STALE_MS = 10 * 60 * 1000;
/** Per-tick batch limits so the loops stay bounded on large tables. */
const DELIVERY_BATCH_LIMIT = 100;
const ESCALATION_BATCH_LIMIT = 100;

function parseRecordObject(value: unknown): Record<string, any> | null {
  if (!value) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed || (trimmed[0] !== "{" && trimmed[0] !== "[")) return null;
    try {
      const parsed = JSON.parse(trimmed);
      return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : null;
    } catch (_error) {
      return null;
    }
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, any>;
  }
  return null;
}

function buildChannelData(notification: NotificationRecord): Record<string, any> | null {
  const data = parseRecordObject(notification.data);
  const context = parseRecordObject(notification.context);
  if (!data && !context) return null;

  const merged = { ...(data || {}) };
  if (context && merged.context === undefined) {
    merged.context = context;
  }
  return merged;
}

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
  const data = parseRecordObject(notification.data) || (notification.data as any);
  const ctx = parseRecordObject(notification.context) || data?.context;
  const fromContext = ctx?.recipient?.locale || data?.recipient?.locale;
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
   *
   * Idempotency: when `idempotencyKey` is set and a non-cancelled notification with the
   * same key + notificationTypeKey already exists, no new record is created — the existing
   * one is returned (protects against double event emits / flow retries).
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

    // Deduplication by idempotencyKey, scoped by notification type so one business key
    // (e.g. order id) may produce at most one notification per type.
    if (idempotencyKey) {
      const duplicates = await (globalThis as any).Notification.find({
        idempotencyKey,
        notificationTypeKey: notificationTypeKey || null,
        status: { "!=": "cancelled" },
      }).limit(1);
      if (Array.isArray(duplicates) && duplicates.length > 0) {
        const existing = duplicates[0] as NotificationRecord;
        await Notification.log(
          { id: existing.id! },
          "info",
          "delivery",
          `Duplicate send suppressed by idempotencyKey=${idempotencyKey} (type=${notificationTypeKey || "none"})`
        );
        return existing;
      }
    }

    // priorityDevice without user means targeted delivery to a specific device
    // (e.g. guest-cart notification via order.deviceId), not a manager broadcast.
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

    // Expose the notification id inside the FCM `data` payload so the client can
    // acknowledge it as read (markNotificationRead) once the user interacts with it
    // — the id doubles as the read token. Persisted back so recovery/escalation
    // sends (which reload the record from DB) carry it too.
    {
      const dataObj: Record<string, any> =
        parseRecordObject(notification.data) || parseRecordObject(data) || {};
      dataObj.notificationId = notification.id;
      notification.data = dataObj as any;
      await Notification.updateOne({ id: notification.id }).set({ data: dataObj });
    }

    await Notification.log(
      { id: notification.id! },
      "info",
      "delivery",
      `Notification created for delivery: group=${groupTo}, type=${notificationTypeKey || "none"}, event=${eventKey || "none"}, requestedChannels=${requestedChannels.join(",") || "none"}, priorityDeviceOnly=${priorityDeviceOnly}, priorityDevice=${priorityDevice?.id || "none"}, maxDeliveryCost=${notificationValues.maxDeliveryCost === null ? "global fallback" : notificationValues.maxDeliveryCost}, scheduledAt=${notificationValues.scheduledAt ? new Date(notificationValues.scheduledAt).toISOString() : "now"}`
    );

    const deferred = notificationValues.scheduledAt !== null && (notificationValues.scheduledAt as number) > Date.now();
    if (!deferred) {
      await NotificationDispatcher._deliver(notification, priorityDevice, channelTypes, priorityDeviceOnly);
    }

    // Emitter is only for observers (WebSocket, logs, analytics).
    // Losing the event during restart is not critical.
    await emitter.emit("core:notification-created", notification);

    const updatedNotification = await (globalThis as any).Notification.findOne({ id: notification.id! });
    return (updatedNotification || notification) as NotificationRecord;
  }

  /**
   * Internal delivery method. Called both on send() and on recovery/retry.
   * priorityDevice is not stored in DB — not available on recovery.
   *
   * Concurrency: before any channel is attempted, the record is claimed via an atomic
   * status CAS (current status → "processing"). If the claim fails, another worker
   * (send() vs delivery loop, or a parallel admin retry) owns the delivery — we exit.
   */
  static async _deliver(notification: NotificationRecord, priorityDevice?: UserDeviceRecord, channelTypes?: string[], priorityDeviceOnly: boolean = false): Promise<void> {
    const { groupTo } = notification;

    // Do not deliver cancelled notifications, e.g. follow-ups for already completed orders.
    if (notification.status === "cancelled") {
      await Notification.log({ id: notification.id! }, "info", "delivery", "Delivery skipped: notification was cancelled");
      return;
    }

    // Scheduled delivery is not due yet (sendDelaySec); leave it for the loop's next tick.
    if (notification.scheduledAt && Number(notification.scheduledAt) > Date.now()) {
      await Notification.log({ id: notification.id! }, "info", "delivery", `Delivery skipped: scheduled for ${new Date(Number(notification.scheduledAt)).toISOString()} (not due yet)`);
      return;
    }

    // Atomic claim: only one worker may run the waterfall for this record.
    const claimed = await Notification.updateOne({ id: notification.id, status: notification.status })
      .set({ status: "processing" });
    if (!claimed) {
      await Notification.log(
        { id: notification.id! },
        "info",
        "delivery",
        `Delivery skipped: claim failed (record is no longer in status "${notification.status}" — another worker took it or it was finalized)`
      );
      return;
    }

    // Recipient locale for channel-specific/localized template selection.
    // For targeted delivery/guest carts, the language is taken from context.recipient.locale.
    const channelData = buildChannelData(notification);
    if (channelData) notification.data = channelData as any;
    const locale = await resolveNotificationLocale(notification);

    // notification.user comes from the DB as an id string; channels need an object with .id.
    // Populate it here so regular (recovery/retry) and device delivery work consistently.
    let unresolvedUser = false;
    if (notification.user && typeof notification.user === "string") {
      const populatedUser = await User.findOne({ id: notification.user });
      if (populatedUser) {
        notification.user = populatedUser as any;
      } else {
        unresolvedUser = true;
      }
    }

    let attempts = Number(notification.deliveryAttempts) || 0;
    // Compact per-channel decision trail; written as ONE log entry at the end
    // (keeps the record debuggable without flooding `logs`).
    const trace: string[] = [];
    if (unresolvedUser) trace.push(`user ${notification.user} not found (channels receive raw value)`);

    // priorityDeviceOnly means targeted delivery only to the selected UserDevice:
    // form channels are ignored, fallback/waterfall to other channels is forbidden.
    if (priorityDeviceOnly) {
      const priorityChannelTypes = getPriorityDeviceChannelTypes(priorityDevice);
      const token = normalizeDeviceNotificationToken(priorityDevice);
      trace.push(`priority-device-only: provider=${token?.provider || "unknown"}, platform=${token?.platform || "unknown"}, candidates=${priorityChannelTypes.join(",") || "none"}`);
      const priorityChannel = NotificationManager.channels.find(
        (ch) => priorityChannelTypes.includes(ch.type) && ch.forGroupTo.includes(groupTo)
      );

      let sent = false;
      if (!priorityChannel) {
        trace.push(`no registered channel matched ${priorityChannelTypes.join(",") || "unknown"}`);
      } else {
        const enabled = priorityChannel.isEnabled();
        const configured = enabled ? await priorityChannel.isConfigured() : false;
        const ready = configured ? await priorityChannel.isReady() : false;
        if (!enabled || !configured || !ready) {
          trace.push(`${priorityChannel.type}: skipped (enabled=${enabled}, configured=${configured}, ready=${ready})`);
        } else {
          attempts += 1;
          const content = resolveChannelContent(notification, priorityChannel.type, locale);
          sent = await priorityChannel.trySendMessage(
            notification.badge,
            content.body,
            null as any,
            content.title,
            channelData as any,
            priorityDevice
          );
          trace.push(`${priorityChannel.type}: ${sent ? "sent" : `failed (${priorityChannel.error || "unknown error"})`}`);
        }
      }

      await Notification.updateOne({ id: notification.id }).set({
        status: sent ? "sent" : "failed",
        channels: sent ? [{ type: priorityChannel!.type, cost: 0, sentAt: Date.now() }] : [],
        spentCost: 0,
        deliveryAttempts: attempts,
      });
      await Notification.log(
        { id: notification.id! },
        sent ? "info" : "error",
        "delivery",
        `Priority-device-only delivery finished: status=${sent ? "sent" : "failed"}, attempts=${attempts}; ${trace.join("; ")}`
      );
      return;
    }

    // Budget: per-type maxDeliveryCost takes priority over the global fallback (design notes section 3).
    const perMessageCost = notification.maxDeliveryCost ?? null;
    const maxCost: number | null = perMessageCost !== null
      ? Number(perMessageCost)
      : ((await Settings.get("NOTIFICATION_MAX_COST_PER_MESSAGE")) ?? null);
    const maxCostSource = perMessageCost !== null ? "notification type" : "global fallback";

    // Channel filter: explicit parameter (initial send) or the persisted requestedChannels
    // (recovery after restart / scheduled sendDelaySec delivery picked up by the loop).
    const requestedFilter = Array.isArray(channelTypes) && channelTypes.length > 0
      ? channelTypes
      : (Array.isArray(notification.requestedChannels) && notification.requestedChannels.length > 0
        ? notification.requestedChannels
        : null);
    const allowedChannelTypes = requestedFilter
      ? new Set(requestedFilter.map((item) => String(item)))
      : null;

    // Waterfall channel limit: maximum number of channels to try (successes + failures).
    // Important notifications are not limited.
    const maxChannels: number = (await Settings.get("NOTIFICATION_MAX_CHANNELS_PER_MESSAGE")) ?? 3;
    const limitChannels = !notification.important && maxChannels > 0;

    const successChannels: NotificationChannelEntry[] = [];
    let spentCost = 0;
    let budgetSkips = 0;

    const isCostAllowed = (cost: number): boolean => {
      if (cost === 0) return true;
      if (maxCost !== null) return spentCost + cost <= maxCost;
      // maxCost not set: allow only one paid channel per delivery
      return spentCost === 0;
    };

    // If priorityDevice is provided, find its provider channel and try it first.
    // Uses the same provider->channelType mapping as the priorityDeviceOnly path below
    // (token.provider is "fcm", channels are registered as "fcm-mobile"/"fcm-web" — a
    // direct ch.type === provider compare never matches).
    let priorityDelivered = false;
    if (priorityDevice?.notificationToken) {
      const priorityChannelTypes = getPriorityDeviceChannelTypes(priorityDevice);
      const priorityChannel = NotificationManager.channels.find(
        (ch) => priorityChannelTypes.includes(ch.type) && ch.forGroupTo.includes(groupTo)
      );
      if (!priorityChannel) {
        trace.push(`priority device candidates=${priorityChannelTypes.join(",") || "unknown"}: no channel, waterfall continues`);
      } else if (allowedChannelTypes && !allowedChannelTypes.has(priorityChannel.type)) {
        trace.push(`priority ${priorityChannel.type}: skipped (not in requested channels)`);
      } else {
        const enabled = priorityChannel.isEnabled();
        const configured = enabled ? await priorityChannel.isConfigured() : false;
        const ready = configured ? await priorityChannel.isReady() : false;
        if (!enabled || !configured || !ready) {
          trace.push(`priority ${priorityChannel.type}: skipped (enabled=${enabled}, configured=${configured}, ready=${ready})`);
        } else {
          attempts += 1;
          const content = resolveChannelContent(notification, priorityChannel.type, locale);
          const ok = await priorityChannel.trySendMessage(
            notification.badge,
            content.body,
            notification.user as any,
            content.title,
            channelData as any,
            priorityDevice
          );
          if (ok) {
            const priorityCost = Number(priorityChannel.cost) || 0;
            successChannels.push({ type: priorityChannel.type, cost: priorityCost, sentAt: Date.now() });
            spentCost += priorityCost;
            priorityDelivered = true;
            trace.push(`priority ${priorityChannel.type}: sent (cost ${priorityCost})`);
          } else {
            trace.push(`priority ${priorityChannel.type}: failed (${priorityChannel.error || "unknown error"})`);
          }
        }
      }
    }

    if (!priorityDelivered) {
      for (const channel of NotificationManager.channels) {
        if (!channel.forGroupTo.includes(groupTo)) continue; // not traced: group mismatch is structural, not a decision
        if (allowedChannelTypes && !allowedChannelTypes.has(channel.type)) {
          trace.push(`${channel.type}: skipped (not in requested channels)`);
          continue;
        }
        if (!channel.isEnabled()) {
          trace.push(`${channel.type}: skipped (disabled)`);
          continue;
        }
        if (!(await channel.isConfigured())) {
          trace.push(`${channel.type}: skipped (not configured)`);
          continue;
        }
        if (!(await channel.isReady())) {
          trace.push(`${channel.type}: skipped (not ready)`);
          continue;
        }
        if (!channel.forceSend && !isCostAllowed(channel.cost)) {
          budgetSkips += 1;
          trace.push(`${channel.type}: skipped by budget (spent=${spentCost}, cost=${channel.cost})`);
          continue;
        }

        // Waterfall limit: stop trying new channels after the attempt limit is exhausted.
        // forceSend channels (e.g. audit) are not counted or limited.
        if (limitChannels && !channel.forceSend && attempts >= maxChannels) {
          trace.push(`waterfall limit reached (${attempts}/${maxChannels})`);
          break;
        }

        if (!channel.forceSend) attempts += 1;

        const content = resolveChannelContent(notification, channel.type, locale);
        const ok = await channel.trySendMessage(
          notification.badge,
          content.body,
          notification.user as any,
          content.title,
          channelData as any,
          priorityDevice
        );

        if (ok) {
          const channelCost = Number(channel.cost) || 0;
          successChannels.push({ type: channel.type, cost: channelCost, sentAt: Date.now() });
          spentCost += channelCost;
          trace.push(`${channel.type}: sent (cost ${channelCost})`);
          if (channel.forceSend !== true) break;
        } else {
          trace.push(`${channel.type}: failed (${channel.error || "unknown error"})`);
        }
      }
    }

    const sent = successChannels.length > 0;
    await Notification.updateOne({ id: notification.id }).set({
      status: sent ? "sent" : "failed",
      channels: successChannels,
      spentCost,
      deliveryAttempts: attempts,
    });
    await Notification.log(
      { id: notification.id! },
      sent ? "info" : "error",
      "delivery",
      `Delivery finished: status=${sent ? "sent" : "failed"}, channels=${successChannels.map((channel) => channel.type).join(",") || "none"}, spentCost=${spentCost}, attempts=${attempts}, maxAllowedCost=${maxCost === null ? "one paid channel" : maxCost} (${maxCostSource})${budgetSkips > 0 ? `, budgetSkips=${budgetSkips}` : ""}; waterfall: ${trace.join("; ") || "no candidate channels"}`
    );
  }

  // Delivery loop (retry pending)

  private static deliverPendingPromise: ObservablePromise<void> | null = null;
  private static deliverPendingInterval: ReturnType<typeof setInterval> | null = null;

  static startDeliveryLoop(intervalSeconds: number = 60): void {
    if (NotificationDispatcher.deliverPendingInterval) {
      clearInterval(NotificationDispatcher.deliverPendingInterval);
    }

    // First run happens immediately on start and picks up pending notifications after restart.
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
      // Deliver pending notifications that are due (scheduledAt is past/not set) plus
      // stale "processing" claims (worker crashed mid-delivery). Future scheduled
      // notifications (sendDelaySec) and cancelled notifications are skipped.
      const pending = await (globalThis as any).Notification.find({
        or: [
          { status: "pending", scheduledAt: null },
          { status: "pending", scheduledAt: { "<=": now } },
          { status: "processing", updatedAt: { "<": now - PROCESSING_STALE_MS } },
        ],
      }).sort("createdAt ASC").limit(DELIVERY_BATCH_LIMIT) as NotificationRecord[];
      for (const notification of pending) {
        if (notification.status === "processing") {
          await Notification.log({ id: notification.id! }, "warn", "delivery", "Stale processing claim recovered by delivery loop (worker likely crashed mid-delivery)");
        }
        await NotificationDispatcher._deliver(notification);
      }
    })();

    NotificationDispatcher.deliverPendingPromise = new ObservablePromise(promise);
    return promise;
  }

  // Escalation loop (retry sent-but-unread)

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

      // Sent notifications older than the timeout were not opened; try the next channel.
      // escalationExhausted is the terminal flag — once set, the record never re-enters
      // this loop (prevents endless rescans / unbounded log growth).
      const unread = await (globalThis as any).Notification.find({
        status: "sent",
        escalationExhausted: false,
        updatedAt: { "<": cutoff },
      }).sort("updatedAt ASC").limit(ESCALATION_BATCH_LIMIT) as NotificationRecord[];

      for (const notification of unread) {
        await NotificationDispatcher._deliverNextChannel(notification);
      }
    })();

    NotificationDispatcher.escalateSentPromise = new ObservablePromise(promise);
    return promise;
  }

  /**
   * Try the next available channel that hasn't been used yet (for escalation).
   * Terminal outcomes set `escalationExhausted` so the record leaves the loop forever:
   *  - the waterfall channel limit is reached;
   *  - a full pass over the channels produced no delivery (nothing left to try);
   *  - user-group notification without a user (device-targeted send — escalation has
   *    no priorityDevice on recovery, so other channels cannot reach the recipient).
   */
  static async _deliverNextChannel(notification: NotificationRecord): Promise<void> {
    const { groupTo } = notification;

    const markExhausted = async (reason: string, attempts: number, extra: Partial<NotificationRecord> = {}): Promise<void> => {
      await Notification.updateOne({ id: notification.id }).set({
        escalationExhausted: true,
        deliveryAttempts: attempts,
        ...extra,
      });
      await Notification.log({ id: notification.id! }, "info", "escalation", `Escalation finished (terminal): ${reason}`);
    };

    let attempts = Number(notification.deliveryAttempts) || 0;

    // escalateBy=delivered: the device already confirmed receipt (deliveredAt via
    // markNotificationDelivered) — the waterfall's job is done even though the user
    // has not read it yet. deliveredAt is never cleared, so this is terminal.
    // Default (escalateBy=read, untyped notifications) keeps the current behavior:
    // escalate until the record leaves status "sent" by being read.
    if (notification.deliveredAt) {
      const rule = notification.notificationTypeKey ? NotificationTypeRegistry.get(notification.notificationTypeKey) : null;
      if (rule?.escalateBy === "delivered") {
        await markExhausted(
          `delivery acknowledged at ${new Date(Number(notification.deliveredAt)).toISOString()} and type "${rule.key}" escalates by delivered`,
          attempts
        );
        return;
      }
    }

    // Device-targeted notification without a bound user: no other channel can reach
    // the recipient (priorityDevice is not persisted), escalating is pointless.
    if (groupTo === "user" && !notification.user) {
      await markExhausted("user-group notification without user (device-targeted), nothing to escalate", attempts);
      return;
    }

    // If the operator explicitly selected delivery channels, escalation stays within that list:
    // iterate the next unused selected channel without going outside the list (section 11.1).
    const allowedChannelTypes = Array.isArray(notification.requestedChannels) && notification.requestedChannels.length > 0
      ? new Set(notification.requestedChannels.map((item) => String(item)))
      : null;

    // Waterfall limit: do not escalate further after the channel limit is exhausted.
    // Important notifications are not limited.
    const maxChannels: number = (await Settings.get("NOTIFICATION_MAX_CHANNELS_PER_MESSAGE")) ?? 3;
    if (!notification.important && maxChannels > 0 && attempts >= maxChannels) {
      await markExhausted(`channel limit reached (${attempts}/${maxChannels})`, attempts);
      return;
    }

    const usedChannels: NotificationChannelEntry[] = Array.isArray(notification.channels) ? notification.channels : [];
    const usedTypes = new Set(usedChannels.map((e) => e.type));
    // Budget: per-type maxDeliveryCost takes priority over the global fallback (design notes section 3).
    const perMessageCost = notification.maxDeliveryCost ?? null;
    const maxCost: number | null = perMessageCost !== null
      ? Number(perMessageCost)
      : ((await Settings.get("NOTIFICATION_MAX_COST_PER_MESSAGE")) ?? null);
    const maxCostSource = perMessageCost !== null ? "notification type" : "global fallback";
    const channelData = buildChannelData(notification);
    if (channelData) notification.data = channelData as any;
    const locale = await resolveNotificationLocale(notification);
    let spentCost: number = notification.spentCost ?? 0;
    const trace: string[] = [];

    const isCostAllowed = (cost: number): boolean => {
      if (cost === 0) return true;
      if (maxCost !== null) return spentCost + cost <= maxCost;
      // maxCost not set: allow only one paid channel total
      return spentCost === 0;
    };

    for (const channel of NotificationManager.channels) {
      if (!channel.forGroupTo.includes(groupTo)) continue;
      if (allowedChannelTypes && !allowedChannelTypes.has(channel.type)) {
        trace.push(`${channel.type}: skipped (not in requested channels)`);
        continue;
      }
      if (usedTypes.has(channel.type)) {
        trace.push(`${channel.type}: skipped (already used)`);
        continue;
      }
      if (!channel.isEnabled()) {
        trace.push(`${channel.type}: skipped (disabled)`);
        continue;
      }
      if (!(await channel.isConfigured())) {
        trace.push(`${channel.type}: skipped (not configured)`);
        continue;
      }
      if (!(await channel.isReady())) {
        trace.push(`${channel.type}: skipped (not ready)`);
        continue;
      }
      if (!channel.forceSend && !isCostAllowed(channel.cost)) {
        trace.push(`${channel.type}: skipped by budget (spent=${spentCost}, cost=${channel.cost})`);
        continue;
      }

      // Apply the limit inside the loop too, in case multiple channels match.
      if (!notification.important && maxChannels > 0 && !channel.forceSend && attempts >= maxChannels) {
        trace.push(`channel limit reached (${attempts}/${maxChannels})`);
        break;
      }

      if (!channel.forceSend) attempts += 1;
      const content = resolveChannelContent(notification, channel.type, locale);
      const ok = await channel.trySendMessage(
        notification.badge,
        content.body,
        notification.user as any,
        content.title,
        channelData as any
      );

      if (ok) {
        const channelCost = Number(channel.cost) || 0;
        spentCost += channelCost;
        const newEntry: NotificationChannelEntry = { type: channel.type, cost: channelCost, sentAt: Date.now() };
        await Notification.updateOne({ id: notification.id }).set({
          channels: [...usedChannels, newEntry],
          spentCost,
          deliveryAttempts: attempts,
          // Status remains 'sent'; only the frontend confirms read. The record stays
          // escalation-eligible until the limit/candidates run out (next ticks).
        });
        await Notification.log(
          { id: notification.id! },
          "info",
          "escalation",
          `Escalated via ${channel.type} (cost ${channelCost}), totalSpent=${spentCost}, attempts=${attempts}; ${trace.join("; ") || "first candidate"}`
        );
        return;
      } else {
        trace.push(`${channel.type}: failed (${channel.error || "unknown error"})`);
      }
    }

    // Full pass produced no delivery — nothing more to try now or later: terminal.
    await markExhausted(
      `no remaining channel delivered (maxAllowedCost=${maxCost === null ? "one paid channel" : maxCost} (${maxCostSource})); trail: ${trace.join("; ") || "no candidate channels"}`,
      attempts
    );
  }
}
