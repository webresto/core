import { NotificationEventRegistry } from '../../libs/NotificationEventRegistry';
import { NotificationTypeRegistry, NotificationType } from '../../libs/NotificationTypeRegistry';
import { NotificationService } from '../../libs/NotificationService';

declare const mcp: any;

const NOTIFICATION_STATUSES = ['pending', 'sent', 'failed', 'read', 'cancelled'];

function mapNotification(n: any) {
    const user = n.user && typeof n.user === 'object' ? {
        id: n.user.id,
        name: n.user.name || n.user.email || n.user.id || '',
        phone: n.user.phone && typeof n.user.phone === 'object'
            ? `${n.user.phone.code || ''}${n.user.phone.number || ''}${n.user.phone.additionalNumber || ''}`
            : (n.user.phone || ''),
    } : null;

    return {
        id: n.id,
        title: n.title || '',
        body: n.body || '',
        status: n.status || 'pending',
        groupTo: n.groupTo || 'user',
        badge: n.badge || 'info',
        channels: Array.isArray(n.channels) ? n.channels : [],
        requestedChannels: Array.isArray(n.requestedChannels) ? n.requestedChannels : [],
        spentCost: n.spentCost ?? 0,
        readAt: n.readAt || null,
        createdAt: n.createdAt || null,
        updatedAt: n.updatedAt || null,
        data: n.data || null,
        user,
        logsCount: Array.isArray(n.logs) ? n.logs.length : 0,
        orderId: n.data && typeof n.data === 'object' ? n.data.orderId || null : null,
    };
}

export function registerNotificationTools() {
    if (process.env.MCP_ENABLED !== 'true') return;

    mcp.registerTool({
        name: 'notification-list',
        description:
            'Investigation tool. Returns a paginated list of notifications.\n\n'
            + 'Efficient filters (DB-level): status, groupTo, userId.\n'
            + 'JS filters applied after DB fetch: orderId (exact match on data.orderId), q (substring in title/body/user name/phone/email/id).\n'
            + 'Combine filters for best performance: e.g. userId+orderId, userId+status.\n\n'
            + 'Pagination: use skip+limit. Response includes total so you can compute pages.',
        mode: 'protected',
        schema: {
            type: 'object',
            properties: {
                q:       { type: 'string',  description: 'Substring search across title, body, user name, phone, email, user id.', example: 'Иван' },
                status:  { type: 'string',  description: 'Filter by status: pending, sent, failed, read.', example: 'failed' },
                groupTo: { type: 'string',  description: 'Filter by groupTo: user or manager.', example: 'user' },
                userId:  { type: 'string',  description: 'Filter by user id (DB-level, efficient).', example: 'u-abc' },
                orderId: { type: 'string',  description: 'Exact match on data.orderId. Use to find all notifications for a specific order.', example: 'ord-abc' },
                limit:   { type: 'number',  description: 'Page size (default 50, max 200).', example: 50 },
                skip:    { type: 'number',  description: 'Offset. Use skip=N*limit for page N.', example: 0 },
            },
        },
        handler: async ({
            q, status, groupTo, userId, orderId,
            limit: rawLimit = 50, skip = 0,
        }: {
            q?: string; status?: string; groupTo?: string; userId?: string; orderId?: string;
            limit?: number; skip?: number;
        }) => {
            const NotificationModel = (globalThis as any).Notification;
            const limit = Math.min(Math.max(Number(rawLimit) || 50, 1), 200);
            const criteria: Record<string, any> = {};

            if (status && NOTIFICATION_STATUSES.includes(status.toLowerCase())) {
                criteria.status = status.toLowerCase();
            }
            if (groupTo) criteria.groupTo = groupTo.toLowerCase();
            if (userId) criteria.user = userId;

            const needsJsFilter = Boolean(q || orderId);

            if (!needsJsFilter) {
                // Efficient path: DB count + paginated fetch
                const [total, results] = await Promise.all([
                    NotificationModel.count(criteria),
                    NotificationModel.find(criteria)
                        .populate('user')
                        .sort('createdAt DESC')
                        .skip(skip)
                        .limit(limit),
                ]);
                return { total, skip, limit, items: results.map(mapNotification) };
            }

            // JS-filter path: load larger batch, filter, paginate
            const FETCH_CAP = 500;
            let notifications = await NotificationModel.find(criteria)
                .populate('user')
                .sort('createdAt DESC')
                .limit(FETCH_CAP);

            if (orderId) {
                notifications = notifications.filter((n: any) =>
                    n.data && typeof n.data === 'object' && n.data.orderId === orderId,
                );
            }
            if (q) {
                const lq = q.toLowerCase();
                notifications = notifications.filter((n: any) => {
                    const user = n.user && typeof n.user === 'object' ? n.user : {};
                    const phone = user?.phone && typeof user.phone === 'object'
                        ? `${user.phone.code || ''}${user.phone.number || ''}${user.phone.additionalNumber || ''}`
                        : '';
                    const notifOrderId = n.data && typeof n.data === 'object' ? String(n.data.orderId || '') : '';
                    const haystack = [
                        n.id, n.title, n.body,
                        user?.id, user?.name, user?.email, user?.login, phone, notifOrderId,
                    ].map((v) => String(v || '').toLowerCase()).join(' ');
                    return haystack.includes(lq);
                });
            }

            const total = notifications.length;
            const page = notifications.slice(skip, skip + limit);

            return {
                total,
                skip,
                limit,
                items: page.map((n: any) => mapNotification(n)),
            };
        },
    });

    mcp.registerTool({
        name: 'notification-get',
        description:
            'Investigation tool. Returns full details of a single notification: all fields, full logs array, rawPayload. '
            + 'Use to diagnose delivery failures, inspect channel results, trace log entries.',
        mode: 'protected',
        schema: {
            type: 'object',
            properties: {
                id: { type: 'string', description: 'Notification id (uuid).', example: 'n-abc123' },
            },
            required: ['id'],
        },
        handler: async ({ id }: { id: string }) => {
            const NotificationModel = (globalThis as any).Notification;
            const notification = await NotificationModel.findOne({ id }).populate('user');
            if (!notification) return null;
            return {
                ...mapNotification(notification),
                logs: Array.isArray(notification.logs) ? notification.logs : [],
                rawPayload: notification,
            };
        },
    });

    mcp.registerTool({
        name: 'notification-logs',
        description:
            'Returns the logs array for a notification. Use to trace channel-level delivery attempts, errors, retries. '
            + 'Each entry has: level, timestamp, module, message, data.',
        mode: 'protected',
        schema: {
            type: 'object',
            properties: {
                id:    { type: 'string', description: 'Notification id.', example: 'n-abc123' },
                level: { type: 'string', description: 'Filter by log level: info, warn, error, debug.', example: 'error' },
            },
            required: ['id'],
        },
        handler: async ({ id, level }: { id: string; level?: string }) => {
            const NotificationModel = (globalThis as any).Notification;
            const notification = await NotificationModel.findOne({ id });
            if (!notification) return null;
            let logs = Array.isArray(notification.logs) ? notification.logs : [];
            if (level) {
                const lv = level.toLowerCase();
                logs = logs.filter((e: any) => (e.level || '').toLowerCase() === lv);
            }
            return { id, total: logs.length, logs };
        },
    });

    mcp.registerTool({
        name: 'notification-channels-state',
        description:
            'Returns current state of all registered notification channels: type, enabled flag, sortOrder, cost, status, error. '
            + 'Use to diagnose why a channel is not delivering (disabled, error state, misconfigured).',
        mode: 'protected',
        schema: { type: 'object', properties: {} },
        handler: async () => {
            const NotificationManager = (globalThis as any).NotificationManager;
            if (!NotificationManager) {
                throw new Error('NotificationManager is not available on globalThis');
            }
            const channels = Array.isArray(NotificationManager.channels) ? NotificationManager.channels : [];
            return channels.map((ch: any) => ({
                type: ch.type,
                enabled: ch.enabled !== false,
                sortOrder: ch.sortOrder ?? 0,
                cost: ch.cost ?? 0,
                status: ch.status ?? 'ready',
                error: ch.error ?? null,
            }));
        },
    });

    // ─── Typed notifications: events + types catalog + emit test ──────────────

    mcp.registerTool({
        name: 'notification-event-list',
        description:
            'Returns the registered notification events (business triggers), e.g. order_accepted, order_on_the_way. '
            + 'Registering an event does NOT enable sending — sending is configured per notification type.',
        mode: 'protected',
        schema: { type: 'object', properties: {} },
        handler: async () => {
            return { total: NotificationEventRegistry.listEvents().length, events: NotificationEventRegistry.listEvents() };
        },
    });

    mcp.registerTool({
        name: 'notification-type-list',
        description:
            'Returns the notification types catalog (NotificationRules model). Each type binds an event to delivery rules '
            + '(maxDeliveryCost, sendDelaySec, channels mode) and templates. Filter by eventKey or enabled.',
        mode: 'protected',
        schema: {
            type: 'object',
            properties: {
                eventKey: { type: 'string', description: 'Filter by bound event key.', example: 'order_on_the_way' },
                enabled:  { type: 'boolean', description: 'Filter by enabled flag.' },
            },
        },
        handler: async ({ eventKey, enabled }: { eventKey?: string; enabled?: boolean }) => {
            await NotificationTypeRegistry.load();
            let types = NotificationTypeRegistry.getAll();
            if (eventKey) types = types.filter((t) => t.eventKey === eventKey);
            if (typeof enabled === 'boolean') types = types.filter((t) => Boolean(t.enabled) === enabled);
            return { total: types.length, types };
        },
    });

    mcp.registerTool({
        name: 'notification-type-get',
        description: 'Returns a single notification type by key, including its full template configuration.',
        mode: 'protected',
        schema: {
            type: 'object',
            properties: { key: { type: 'string', description: 'Notification type key.', example: 'order_on_the_way_push' } },
            required: ['key'],
        },
        handler: async ({ key }: { key: string }) => {
            await NotificationTypeRegistry.load();
            return NotificationTypeRegistry.get(key);
        },
    });

    mcp.registerTool({
        name: 'notification-type-upsert',
        description:
            'Create or update a notification type in the catalog. Validates key (snake_case) and eventKey. '
            + 'Set enabled:true to allow sending. Provide full type object (see notification-type-get for shape).',
        mode: 'protected',
        schema: {
            type: 'object',
            properties: {
                type: {
                    type: 'object',
                    description: 'Notification type object. Required: key, eventKey. Optional: name, description, enabled, priority, sendDelaySec, important, maxDeliveryCost, useGlobalFallback, channelsMode, escalateBy (read|delivered), fixedChannels, defaultChannels, templates.',
                },
            },
            required: ['type'],
        },
        handler: async ({ type }: { type: NotificationType }) => {
            await NotificationTypeRegistry.load();
            const errors = NotificationTypeRegistry.validate(type || ({} as NotificationType));
            if (errors.length > 0) return { success: false, errors };
            const saved = await NotificationTypeRegistry.upsert(type);
            return { success: true, type: saved };
        },
    });

    mcp.registerTool({
        name: 'notification-type-delete',
        description: 'Remove a notification type from the catalog by key.',
        mode: 'protected',
        schema: {
            type: 'object',
            properties: { key: { type: 'string', description: 'Notification type key.', example: 'order_on_the_way_push' } },
            required: ['key'],
        },
        handler: async ({ key }: { key: string }) => {
            await NotificationTypeRegistry.load();
            const removed = await NotificationTypeRegistry.remove(key);
            return { success: removed };
        },
    });

    mcp.registerTool({
        name: 'notification-emit-test',
        description:
            'Fire a notification event through NotificationService for testing. By default dryRun:true — resolves which '
            + 'enabled types match and how their templates render WITHOUT creating/sending. Set dryRun:false to actually send '
            + '(creates Notification records and runs the delivery waterfall).',
        mode: 'protected',
        schema: {
            type: 'object',
            properties: {
                eventKey:  { type: 'string',  description: 'Registered event key to emit.', example: 'order_on_the_way' },
                recipient: { type: 'object',  description: 'Recipient: { userId, locale, timezone }.', example: { userId: 'u-123', locale: 'en' } },
                context:   { type: 'object',  description: 'Business context: { order, user, store, otp, ... }.', example: { order: { id: '987', shortId: '12345' } } },
                meta:      { type: 'object',  description: 'Optional meta: { correlationId, idempotencyKey, sourceModule }.' },
                priorityDeviceId: { type: 'string', description: 'UserDevice id for device-targeted delivery without a bound user (e.g. guest/anonymous browser deviceId). The device push channel is tried first; groupTo defaults to "user".', example: 'd850dddf-e36e-4324-ac96-661af0712be5' },
                dryRun:    { type: 'boolean', description: 'Default true. When false, actually creates+delivers notifications.' },
            },
            required: ['eventKey'],
        },
        handler: async ({ eventKey, recipient, context, meta, priorityDeviceId, dryRun }: {
            eventKey: string; recipient?: any; context?: any; meta?: any; priorityDeviceId?: string; dryRun?: boolean;
        }) => {
            const effectiveDryRun = dryRun !== false; // default true
            await NotificationTypeRegistry.load();
            const registered = NotificationEventRegistry.isRegistered(eventKey);
            const matchedTypes = NotificationTypeRegistry.getByEvent(eventKey).map((t) => t.key);
            const results = await NotificationService.emit(eventKey, { recipient, context, meta, priorityDeviceId }, effectiveDryRun);
            return { eventKey, registered, dryRun: effectiveDryRun, matchedTypes, results };
        },
    });
}
