/**
 * NotificationService
 *
 * Single entry point for business logic to fire a notification *event*. It maps the
 * event onto the enabled notification *types* (NotificationTypeRegistry), renders
 * templates, computes per-type budget / delay / channels, and hands each resulting
 * notification to NotificationDispatcher.send.
 *
 * Flow (design notes §2 "Принцип"):
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
      // Не падаем: событие может прийти из модуля, который не зарегистрировал его.
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
    const groupTo = payload.groupTo || (userParam ? "user" : "manager");

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

        // Канонический объект уведомления (push-notifications.md «единый контракт»).
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
        // Удобные плоские поля для FCM data (строки).
        if ((context as any)?.order?.shortId) data.shortId = String((context as any).order.shortId);
        if ((context as any)?.order?.id) data.orderId = String((context as any).order.id);
        if (defaultContent.clickUrl) data.deeplinkUrl = defaultContent.clickUrl;

        const sendOptions: NotificationSendOptions = {
          user: userParam,
          title: defaultContent.title,
          body: defaultContent.body,
          data,
          badge: payload.badge || "info",
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
}
