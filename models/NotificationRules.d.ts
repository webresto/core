import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";
import { RequiredField, OptionalAll } from "../interfaces/toolsTS";
/**
 * NotificationRules
 *
 * A notification *rule* (a.k.a. notification type) binds one business event (`eventKey`,
 * NotificationEventRegistry) to delivery configuration + templates. It is the persisted,
 * editable half of the typed-notifications model from `notifications-design-notes.md`:
 *  - maxDeliveryCost / useGlobalFallback — per-rule budget (§3);
 *  - sendDelaySec — delay before first send (§6);
 *  - channelsMode + fixedChannels/defaultChannels — channel selection (§4);
 *  - templates — base + per-locale + channel-specific (§1).
 *
 * Storage moved from the `NOTIFICATION_TYPES` Settings JSON to this model so critical
 * checks (snake_case key, eventKey, budget/delay ranges, fixed-channels) run in the model
 * lifecycle and the catalog gets normal DB semantics. `NotificationTypeRegistry` is the
 * read/cache facade over this model.
 */
export type NotificationPriority = "normal" | "high" | "critical";
export type NotificationChannelsMode = "waterfall" | "fixed";
export interface NotificationTemplateContent {
    title?: string;
    body?: string;
    subject?: string;
    clickUrl?: string;
    [key: string]: string | undefined;
}
export interface NotificationRuleTemplates {
    /** Base template (fallback for everything) */
    default?: NotificationTemplateContent;
    /** Per-locale overrides, keyed by locale (e.g. "ru", "en") */
    locales?: Record<string, NotificationTemplateContent>;
    /**
     * Channel-specific overrides, keyed by channel type, then by locale or "default".
     * e.g. { "sms": { "default": {...}, "ru": {...} } }
     */
    channels?: Record<string, Record<string, NotificationTemplateContent>>;
}
declare let attributes: {
    /** UUID — генерируется в beforeCreate. */
    id: string;
    /** Бизнес-ключ правила (snake_case, уникален), напр. "order_accepted_push". */
    key: string;
    /** Человекочитаемое название. */
    name: string | null;
    /** Назначение / когда срабатывает. */
    description: string | null;
    /** Событие, на которое реагирует правило (NotificationEventRegistry key). */
    eventKey: string;
    /** Включена ли отправка для этого правила (регистрация ≠ отправка). */
    enabled: boolean;
    priority: NotificationPriority;
    /** Задержка (сек) до первой попытки доставки. По умолчанию 0. */
    sendDelaySec: number;
    /** Освобождает уведомление от лимита каналов водопада. */
    important: boolean;
    /** Per-rule бюджет доставки. null = не задан (действует глобальный fallback). */
    maxDeliveryCost: number | null;
    /** Если true — игнорировать maxDeliveryCost и использовать глобальный NOTIFICATION_MAX_COST_PER_MESSAGE. */
    useGlobalFallback: boolean;
    channelsMode: NotificationChannelsMode;
    /** Используется только при channelsMode === "fixed". */
    fixedChannels: string[];
    /** Предпочтительные каналы для старта водопада (channelsMode === "waterfall"). */
    defaultChannels: string[];
    /** Шаблоны: base + per-locale + channel-specific. */
    templates: NotificationRuleTemplates;
};
type attributes = typeof attributes;
export interface NotificationRulesRecord extends RequiredField<OptionalAll<attributes>, null>, ORM {
}
declare let Model: {
    beforeCreate(init: NotificationRulesRecord, cb: (err?: string) => void): void;
    beforeUpdate(values: Partial<NotificationRulesRecord>, cb: (err?: string) => void): void;
    /** Validate a rule payload (see {@link validateRule}). */
    validateRule(rule: Partial<NotificationRulesRecord>): string[];
    /**
     * Seed the example rules (all disabled — registration ≠ sending) when the catalog is empty.
     * Replaces the old `NOTIFICATION_TYPES` settings `defaultValue`.
     */
    seedDefaults(): Promise<void>;
};
declare global {
    const NotificationRules: typeof Model & ORMModel<NotificationRulesRecord, "name" | "description" | "enabled" | "priority" | "sendDelaySec" | "important" | "maxDeliveryCost" | "useGlobalFallback" | "channelsMode" | "fixedChannels" | "defaultChannels" | "templates">;
}
export {};
