/**
 * NotificationService
 *
 * Single entry point for business logic to fire a notification *event*. It maps the
 * event onto the enabled notification *types* (NotificationTypeRegistry), renders
 * templates, computes per-type budget / delay / channels, and hands each resulting
 * notification to NotificationDispatcher.send.
 *
 * Flow (design notes section 2 "Principle"):
 *   business logic -> emit(eventKey, payload)
 *     -> for each enabled type bound to the event:
 *          build canonical notification object (type/event/context/render/routing/meta)
 *          -> dispatcher.send({ ...budget, ...delay, ...channels })
 *
 * Registering an event does not send anything; only enabled types produce notifications.
 */

import { NotificationDispatcher, NotificationSendOptions } from "./NotificationDispatcher";
import { NotificationEventRegistry } from "./NotificationEventRegistry";
import { NotificationTypeRegistry, NotificationType } from "./NotificationTypeRegistry";
import { NotificationTemplateRenderer } from "./NotificationTemplateRenderer";

export interface NotificationRecipient {
  /** User id (string) or user record; null for manager/device broadcasts. */
  userId?: string | null;
  user?: any | null;
  locale?: string;
  timezone?: string;
  [key: string]: any;
}

export interface EmitPayload {
  recipient?: NotificationRecipient | null;
  /** Business context: { order, user, store, otp, ... }. Passed through to channels. */
  context?: Record<string, any>;
  meta?: {
    correlationId?: string;
    idempotencyKey?: string;
    sourceModule?: string;
    [key: string]: any;
  };
  /** Event time (ms). Defaults to Date.now(). sendDelaySec is added on top. */
  occurredAt?: number;
  badge?: "info" | "error";
  /** Override target group; default "user" when recipient present else "manager". */
  groupTo?: "user" | "manager";
  /**
   * UserDevice id for device-targeted delivery without a bound user (guest order/cart).
   * The device's push provider channel is tried first; groupTo defaults to "user".
   */
  priorityDeviceId?: string | null;
}

export interface EmitResultEntry {
  typeKey: string;
  status: "sent" | "scheduled" | "skipped" | "error" | "dry-run";
  notificationId?: string;
  scheduledAt?: number | null;
  requestedChannels?: string[];
  maxDeliveryCost?: number | null;
  render?: any;
  reason?: string;
}

function buildIdempotencyKey(eventKey: string, type: NotificationType, payload: EmitPayload): string {
  if (payload.meta?.idempotencyKey) return String(payload.meta.idempotencyKey);
  const ctx = payload.context || {};
  const anchor = ctx.order?.id || ctx.order?.shortId || ctx.user?.id || payload.recipient?.userId || "";
  return `${eventKey}_${type.key}${anchor ? `_${anchor}` : ""}`;
}

function resolveLocale(payload: EmitPayload): string | undefined {
  return payload.recipient?.locale
    || (payload.context as any)?.recipient?.locale
    || (payload.recipient?.user && payload.recipient.user.locale)
    || undefined;
}

export class NotificationService {
  /**
   * Fire a notification event. Returns a per-type result list (also useful for dry-run).
   * @param dryRun when true, resolves matched types + rendered content WITHOUT creating/sending.
   */
  static async emit(eventKey: string, payload: EmitPayload = {}, dryRun: boolean = false): Promise<EmitResultEntry[]> {
    const key = String(eventKey || "").trim();
    const results: EmitResultEntry[] = [];

    if (!key) {
      sails.log.warn("[NotificationService] emit called without eventKey");
      return results;
    }

    if (!NotificationEventRegistry.isRegistered(key)) {
      // Do not fail: an event may come from a module that did not register it.
      sails.log.warn(`[NotificationService] Event "${key}" is not registered; nothing to emit`);
      return results;
    }

    const types = NotificationTypeRegistry.getByEvent(key);
    if (types.length === 0) {
      sails.log.verbose(`[NotificationService] Event "${key}" has no enabled notification types`);
      return results;
    }

    const occurredAt = Number(payload.occurredAt) || Date.now();
    const context = payload.context || {};
    const recipient = payload.recipient || {};
    const locale = resolveLocale(payload);
    const userParam = recipient.user ?? recipient.userId ?? null;

    // Device-targeted delivery for guest flows (no bound user): resolve the UserDevice
    // once so the dispatcher can try the device's push provider channel first.
    let priorityDevice: any = undefined;
    if (payload.priorityDeviceId) {
      try {
        priorityDevice = await (globalThis as any).UserDevice.findOne({ id: String(payload.priorityDeviceId) }) || undefined;
      } catch (error) {
        sails.log.warn(`[NotificationService] Failed to resolve priorityDeviceId=${payload.priorityDeviceId}`, error);
      }
    }

    const groupTo = payload.groupTo || (userParam || priorityDevice ? "user" : "manager");

    for (const type of types) {
      try {
        const renderBlock = NotificationTemplateRenderer.buildRenderBlock(type, { context, recipient, locale });
        const defaultContent = renderBlock.default;

        const maxDeliveryCost = type.useGlobalFallback ? null : (type.maxDeliveryCost ?? null);
        const requestedChannels = type.channelsMode === "fixed"
          ? (type.fixedChannels || [])
          : (type.defaultChannels || []);
        const scheduledAt = type.sendDelaySec && type.sendDelaySec > 0
          ? occurredAt + type.sendDelaySec * 1000
          : null;
        const idempotencyKey = buildIdempotencyKey(key, type, payload);

        // Canonical notification object (push-notifications.md "single contract").
        const data: Record<string, any> = {
          notificationTypeKey: type.key,
          eventKey: key,
          occurredAt: new Date(occurredAt).toISOString(),
          recipient,
          context,
          render: renderBlock,
          routing: {
            deeplinkUrl: defaultContent.clickUrl || (context as any)?.routing?.deeplinkUrl || undefined,
            webUrl: (context as any)?.routing?.webUrl || undefined,
          },
          meta: {
            correlationId: payload.meta?.correlationId,
            idempotencyKey,
            sourceModule: payload.meta?.sourceModule,
          },
        };
        // Convenient flat fields for FCM data (strings).
        if ((context as any)?.order?.number) data.number = String((context as any).order.number);
        if ((context as any)?.order?.shortId) data.shortId = String((context as any).order.shortId);
        if ((context as any)?.order?.id) data.orderId = String((context as any).order.id);
        if (defaultContent.clickUrl) data.deeplinkUrl = defaultContent.clickUrl;

        const sendOptions: NotificationSendOptions = {
          user: userParam,
          title: defaultContent.title,
          body: defaultContent.body,
          data,
          badge: payload.badge || "info",
          priorityDevice,
          groupTo,
          channelTypes: requestedChannels.length > 0 ? requestedChannels : undefined,
          important: Boolean(type.important),
          notificationTypeKey: type.key,
          eventKey: key,
          context,
          maxDeliveryCost,
          scheduledAt,
          idempotencyKey,
        };

        if (dryRun) {
          results.push({
            typeKey: type.key,
            status: "dry-run",
            scheduledAt,
            requestedChannels,
            maxDeliveryCost,
            render: { title: defaultContent.title, body: defaultContent.body, channels: renderBlock.channels },
          });
          continue;
        }

        const notification = await NotificationDispatcher.send(sendOptions);
        results.push({
          typeKey: type.key,
          status: scheduledAt ? "scheduled" : (notification.status === "sent" ? "sent" : "skipped"),
          notificationId: notification.id || undefined,
          scheduledAt,
          requestedChannels,
          maxDeliveryCost,
        });
      } catch (error) {
        sails.log.error(`[NotificationService] Failed to emit type "${type.key}" for event "${key}"`, error);
        results.push({ typeKey: type.key, status: "error", reason: error instanceof Error ? error.message : String(error) });
      }
    }

    return results;
  }

  /**
   * Cancel not-yet-delivered (pending) notifications by idempotencyKey — e.g. a
   * follow-up reminder when the order was completed before the delay window elapsed.
   * Returns the number of cancelled records.
   */
  static async cancel(idempotencyKey: string): Promise<number> {
    const key = String(idempotencyKey || "").trim();
    if (!key) return 0;

    const pending = await (globalThis as any).Notification.find({ idempotencyKey: key, status: "pending" });
    let cancelled = 0;
    for (const notification of pending) {
      await (globalThis as any).Notification.updateOne({ id: notification.id }).set({ status: "cancelled" });
      await (globalThis as any).Notification.log({ id: notification.id }, "info", "delivery", `Notification cancelled by idempotencyKey=${key}`);
      cancelled += 1;
    }
    return cancelled;
  }

  /**
   * Cancel all pending notifications anchored to an order (auto-built idempotency keys
   * end with `_<orderId>`, see buildIdempotencyKey). Called on order completion/rejection
   * so delayed follow-ups (sendDelaySec) never fire for finished orders.
   */
  static async cancelPendingForOrder(orderId: string): Promise<number> {
    const anchor = String(orderId || "").trim();
    if (!anchor) return 0;

    const pending = await (globalThis as any).Notification.find({
      status: "pending",
      idempotencyKey: { endsWith: `_${anchor}` },
    });
    let cancelled = 0;
    for (const notification of pending) {
      await (globalThis as any).Notification.updateOne({ id: notification.id }).set({ status: "cancelled" });
      await (globalThis as any).Notification.log({ id: notification.id }, "info", "delivery", `Notification cancelled: order ${anchor} finished before scheduled delivery`);
      cancelled += 1;
    }
    return cancelled;
  }

  // ─── user_birthday trigger ──────────────────────────────────────────────────

  private static birthdayInterval: ReturnType<typeof setInterval> | null = null;
  private static birthdayCheckRunning = false;

  /**
   * Periodic check that fires the `user_birthday` event for users whose birthday
   * (stored as "YYYY-MM-DD") matches today. Runs hourly; duplicate sends within a year
   * are prevented by the idempotencyKey `user_birthday:<userId>:<year>` (dispatcher dedup).
   * Emitting is cheap when no enabled notification type is bound to the event.
   */
  static startBirthdayLoop(intervalMinutes: number = 60): void {
    if (NotificationService.birthdayInterval) {
      clearInterval(NotificationService.birthdayInterval);
    }
    void NotificationService._checkBirthdays();
    NotificationService.birthdayInterval = setInterval(
      () => void NotificationService._checkBirthdays(),
      intervalMinutes * 60 * 1000
    );
  }

  static async _checkBirthdays(): Promise<void> {
    if (NotificationService.birthdayCheckRunning) return;
    NotificationService.birthdayCheckRunning = true;
    try {
      if (!NotificationEventRegistry.isRegistered("user_birthday")) return;
      if (NotificationTypeRegistry.getByEvent("user_birthday").length === 0) return;

      const now = new Date();
      const year = now.getFullYear();
      const monthDay = `${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

      // birthday is stored as a "YYYY-MM-DD" string (models/User.ts)
      const users = await (globalThis as any).User.find({ birthday: { endsWith: `-${monthDay}` } });
      for (const user of users) {
        try {
          await NotificationService.emit("user_birthday", {
            recipient: { userId: user.id, user },
            context: {
              user: {
                firstName: user.firstName,
                lastName: user.lastName,
                phone: user.phone ? `${user.phone.code || ""}${user.phone.number || ""}` : undefined,
                email: user.email,
                birthday: user.birthday,
              },
            },
            meta: {
              sourceModule: "core/birthday-loop",
              idempotencyKey: `user_birthday:${user.id}:${year}`,
            },
          });
        } catch (error) {
          sails.log.error(`[NotificationService] birthday emit failed for user ${user.id}`, error);
        }
      }
    } catch (error) {
      sails.log.error("[NotificationService] birthday check failed", error);
    } finally {
      NotificationService.birthdayCheckRunning = false;
    }
  }
}
