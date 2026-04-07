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
        allowNull: true,
    },
    title: {
        type: "string",
    },
    body: {
        type: "string",
    },
    /** Произвольный payload: { type, orderId, ... } */
    data: "json",
    /**
     * Жизненный цикл:
     * pending  → запись создана, доставка ещё не пробовалась
     * sent     → канал принял сообщение без ошибки (FCM не гарантирует доставку на устройство)
     * failed   → все каналы вернули ошибку, retry-loop подхватит
     * read     → фронт подтвердил через markNotificationRead(id)
     */
    status: {
        type: "string",
        isIn: ["pending", "sent", "failed", "read"],
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
    /** Каналы доставки (несколько если forceSend: true) */
    channels: "json",
    /** Лог всех попыток доставки, эскалаций, ошибок */
    logs: "json",
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
