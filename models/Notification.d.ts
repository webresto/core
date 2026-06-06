import ORM from "../interfaces/ORM";
import { ORMModel, CriteriaQuery } from "../interfaces/ORMModel";
import { RequiredField, OptionalAll } from "../interfaces/toolsTS";
import { UserRecord } from "./User";
import { NotificationLogLevel, NotificationLogEntry } from "../libs/NotificationLogHelper";
export interface NotificationChannelEntry {
    /** Channel type identifier, e.g. "fcm-mobile", "test-free-unreliable" */
    type: string;
    /** Cost of this channel send (same units as Channel.cost) */
    cost: number;
    /** Timestamp (ms) when the message was sent via this channel */
    sentAt: number;
}
declare let attributes: {
    /** UUID — генерируется в beforeCreate. Также используется как токен чтения. */
    id: string;
    user: UserRecord | string | null;
    title: string;
    body: string;
    /** Произвольный payload: { type, orderId, render, routing, ... } */
    data: object | null;
    /**
     * Ключ типа уведомления из каталога NOTIFICATION_TYPES (если уведомление типизировано).
     * null — нетипизированная отправка (напр. ручное создание из админки).
     */
    notificationTypeKey: string | null;
    /** Ключ бизнес-события (NotificationEventRegistry), породившего уведомление. */
    eventKey: string | null;
    /**
     * Бизнес-контекст события целиком (order/user/store/...). Доставляется до адаптера канала,
     * который сам берёт нужные поля (push-notifications.md «единый контракт»).
     */
    context: object | null;
    /**
     * Per-message лимит стоимости доставки (из настройки типа maxDeliveryCost).
     * Имеет приоритет над глобальным NOTIFICATION_MAX_COST_PER_MESSAGE.
     * null — лимит типа не задан, действует глобальный fallback.
     */
    maxDeliveryCost: number | null;
    /**
     * Время (ms), раньше которого доставка не выполняется (sendDelaySec).
     * null/в прошлом — доставка сразу. В будущем — delivery-loop подхватит по наступлении.
     */
    scheduledAt: number | null;
    /** Ключ идемпотентности/корреляции для дедупликации и отмены запланированной доставки. */
    idempotencyKey: string | null;
    /**
     * Жизненный цикл:
     * pending   → запись создана, доставка ещё не пробовалась (или ждёт scheduledAt)
     * sent      → канал принял сообщение без ошибки (FCM не гарантирует доставку на устройство)
     * failed    → все каналы вернули ошибку, retry-loop подхватит
     * read      → фронт подтвердил через markNotificationRead(id)
     * cancelled → отправка отменена до доставки (напр. догонка по уже завершённому заказу)
     */
    status: "pending" | "sent" | "failed" | "read" | "cancelled";
    /** Целевая группа — нужна _deliver() при recovery */
    groupTo: "user" | "manager";
    /** Timestamp прочтения (ms), null пока не прочитано */
    readAt: number | null;
    /** Каналы доставки с деталями: тип, стоимость, время отправки (фактически отправленные) */
    channels: NotificationChannelEntry[];
    /** Типы каналов, выбранные для доставки при создании уведомления */
    requestedChannels: string[];
    /**
     * Суммарная стоимость всех каналов, через которые было отправлено уведомление.
     * Накапливается при доставке и эскалациях. 0 = только бесплатные каналы.
     */
    spentCost: number;
    /** Лог всех попыток доставки, эскалаций, ошибок */
    logs: NotificationLogEntry[];
    /**
     * Важное сообщение. На важные уведомления не действует лимит каналов водопада
     * (NOTIFICATION_MAX_CHANNELS_PER_MESSAGE) — они эскалируются по всем каналам до успеха.
     */
    important: boolean;
    /**
     * Суммарное число попыток доставки по каналам (успешные + неудачные),
     * накапливается при первичной доставке и эскалациях. Используется для лимита водопада.
     */
    deliveryAttempts: number;
    badge: "info" | "error";
    createdAt: number;
    updatedAt: number;
};
type attributes = typeof attributes;
export interface NotificationRecord extends RequiredField<OptionalAll<attributes>, null>, ORM {
}
declare let Model: {
    beforeCreate(init: NotificationRecord, cb: (err?: string) => void): void;
    log(criteria: CriteriaQuery<NotificationRecord>, level: NotificationLogLevel, module: string, message: string, ...data: any[]): Promise<void>;
};
declare global {
    const Notification: typeof Model & ORMModel<NotificationRecord, "readAt" | "data" | "channels" | "requestedChannels" | "logs" | "spentCost" | "important" | "deliveryAttempts" | "notificationTypeKey" | "eventKey" | "context" | "maxDeliveryCost" | "scheduledAt" | "idempotencyKey">;
}
export {};
