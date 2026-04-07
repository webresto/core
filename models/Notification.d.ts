import ORM from "../interfaces/ORM";
import { ORMModel, CriteriaQuery } from "../interfaces/ORMModel";
import { RequiredField, OptionalAll } from "../interfaces/toolsTS";
import { UserRecord } from "./User";
import { NotificationLogLevel, NotificationLogEntry } from "../libs/NotificationLogHelper";
declare let attributes: {
    /** UUID — генерируется в beforeCreate. Также используется как токен чтения. */
    id: string;
    user: UserRecord | string | null;
    title: string;
    body: string;
    /** Произвольный payload: { type, orderId, ... } */
    data: object | null;
    /**
     * Жизненный цикл:
     * pending  → запись создана, доставка ещё не пробовалась
     * sent     → канал принял сообщение без ошибки (FCM не гарантирует доставку на устройство)
     * failed   → все каналы вернули ошибку, retry-loop подхватит
     * read     → фронт подтвердил через markNotificationRead(id)
     */
    status: "pending" | "sent" | "failed" | "read";
    /** Целевая группа — нужна _deliver() при recovery */
    groupTo: "user" | "manager";
    /** Timestamp прочтения (ms), null пока не прочитано */
    readAt: number | null;
    /** Каналы доставки (несколько если forceSend: true) */
    channels: string[];
    /** Лог всех попыток доставки, эскалаций, ошибок */
    logs: NotificationLogEntry[];
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
    const Notification: typeof Model & ORMModel<NotificationRecord, "readAt" | "data" | "channels" | "logs">;
}
export {};
