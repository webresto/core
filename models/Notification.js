"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
const NotificationLogHelper_1 = __importDefault(require("../libs/NotificationLogHelper"));
let attributes = {
    /** UUID — генерируется в beforeCreate. Также используется как токен чтения. */
    id: {
        type: "string",
    },
    user: {
        model: "user",
        required: false,
    },
    title: {
        type: "string",
    },
    body: {
        type: "string",
    },
    /** Произвольный payload: { type, orderId, render, routing, ... } */
    data: "json",
    /**
     * Ключ типа уведомления из каталога NOTIFICATION_TYPES (если уведомление типизировано).
     * null — нетипизированная отправка (напр. ручное создание из админки).
     */
    notificationTypeKey: {
        type: "string",
        allowNull: true,
    },
    /** Ключ бизнес-события (NotificationEventRegistry), породившего уведомление. */
    eventKey: {
        type: "string",
        allowNull: true,
    },
    /**
     * Бизнес-контекст события целиком (order/user/store/...). Доставляется до адаптера канала,
     * который сам берёт нужные поля (push-notifications.md «единый контракт»).
     */
    context: "json",
    /**
     * Per-message лимит стоимости доставки (из настройки типа maxDeliveryCost).
     * Имеет приоритет над глобальным NOTIFICATION_MAX_COST_PER_MESSAGE.
     * null — лимит типа не задан, действует глобальный fallback.
     */
    maxDeliveryCost: {
        type: "number",
        allowNull: true,
    },
    /**
     * Время (ms), раньше которого доставка не выполняется (sendDelaySec).
     * null/в прошлом — доставка сразу. В будущем — delivery-loop подхватит по наступлении.
     */
    scheduledAt: {
        type: "number",
        allowNull: true,
    },
    /** Ключ идемпотентности/корреляции для дедупликации и отмены запланированной доставки. */
    idempotencyKey: {
        type: "string",
        allowNull: true,
    },
    /**
     * Жизненный цикл:
     * pending   → запись создана, доставка ещё не пробовалась (или ждёт scheduledAt)
     * sent      → канал принял сообщение без ошибки (FCM не гарантирует доставку на устройство)
     * failed    → все каналы вернули ошибку, retry-loop подхватит
     * read      → фронт подтвердил через markNotificationRead(id)
     * cancelled → отправка отменена до доставки (напр. догонка по уже завершённому заказу)
     */
    status: {
        type: "string",
        isIn: ["pending", "sent", "failed", "read", "cancelled"],
        defaultsTo: "pending",
    },
    /** Целевая группа — нужна _deliver() при recovery */
    groupTo: {
        type: "string",
        isIn: ["user", "manager"],
        defaultsTo: "user",
    },
    /** Timestamp прочтения (ms), null пока не прочитано */
    readAt: {
        type: "number",
        allowNull: true,
    },
    /** Каналы доставки с деталями: тип, стоимость, время отправки (фактически отправленные) */
    channels: "json",
    /** Типы каналов, выбранные для доставки при создании уведомления */
    requestedChannels: "json",
    /**
     * Суммарная стоимость всех каналов, через которые было отправлено уведомление.
     * Накапливается при доставке и эскалациях. 0 = только бесплатные каналы.
     */
    spentCost: {
        type: "number",
        defaultsTo: 0,
    },
    /** Лог всех попыток доставки, эскалаций, ошибок */
    logs: "json",
    /**
     * Важное сообщение. На важные уведомления не действует лимит каналов водопада
     * (NOTIFICATION_MAX_CHANNELS_PER_MESSAGE) — они эскалируются по всем каналам до успеха.
     */
    important: {
        type: "boolean",
        defaultsTo: false,
    },
    /**
     * Суммарное число попыток доставки по каналам (успешные + неудачные),
     * накапливается при первичной доставке и эскалациях. Используется для лимита водопада.
     */
    deliveryAttempts: {
        type: "number",
        defaultsTo: 0,
    },
    badge: {
        type: "string",
        isIn: ["info", "error"],
        defaultsTo: "info",
    },
    createdAt: {
        type: "number",
    },
    updatedAt: {
        type: "number",
    },
};
let Model = {
    beforeCreate(init, cb) {
        if (!init.id) {
            init.id = (0, uuid_1.v4)();
        }
        cb();
    },
    async log(criteria, level, module, message, ...data) {
        return NotificationLogHelper_1.default.log(criteria, level, module, message, ...data);
    },
};
module.exports = {
    primaryKey: "id",
    attributes: attributes,
    ...Model,
};
