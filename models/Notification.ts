import ORM from "../interfaces/ORM";
import { ORMModel, CriteriaQuery } from "../interfaces/ORMModel";
import { v4 as uuid } from "uuid";
import { RequiredField, OptionalAll } from "../interfaces/toolsTS";
import { UserRecord } from "./User";
import NotificationLogHelper, { NotificationLogLevel, NotificationLogEntry } from "../libs/NotificationLogHelper";

export interface NotificationChannelEntry {
  /** Channel type identifier, e.g. "fcm-mobile", "test-free-unreliable" */
  type: string;
  /** Cost of this channel send (same units as Channel.cost) */
  cost: number;
  /** Timestamp (ms) when the message was sent via this channel */
  sentAt: number;
}

let attributes = {

  /** UUID — генерируется в beforeCreate. Также используется как токен чтения. */
  id: {
    type: "string",
  } as unknown as string,

  user: {
    model: "user",
    required: false,
  } as unknown as UserRecord | string | null,

  title: {
    type: "string",
  } as unknown as string,

  body: {
    type: "string",
  } as unknown as string,

  /** Произвольный payload: { type, orderId, ... } */
  data: "json" as unknown as object | null,

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
  } as unknown as "pending" | "sent" | "failed" | "read",

  /** Целевая группа — нужна _deliver() при recovery */
  groupTo: {
    type: "string",
    isIn: ["user", "manager"],
    defaultsTo: "user",
  } as unknown as "user" | "manager",

  /** Timestamp прочтения (ms), null пока не прочитано */
  readAt: {
    type: "number",
    allowNull: true,
  } as unknown as number | null,

  /** Каналы доставки с деталями: тип, стоимость, время отправки (фактически отправленные) */
  channels: "json" as unknown as NotificationChannelEntry[],

  /** Типы каналов, выбранные для доставки при создании уведомления */
  requestedChannels: "json" as unknown as string[],

  /**
   * Суммарная стоимость всех каналов, через которые было отправлено уведомление.
   * Накапливается при доставке и эскалациях. 0 = только бесплатные каналы.
   */
  spentCost: {
    type: "number",
    defaultsTo: 0,
  } as unknown as number,

  /** Лог всех попыток доставки, эскалаций, ошибок */
  logs: "json" as unknown as NotificationLogEntry[],

  /**
   * Важное сообщение. На важные уведомления не действует лимит каналов водопада
   * (NOTIFICATION_MAX_CHANNELS_PER_MESSAGE) — они эскалируются по всем каналам до успеха.
   */
  important: {
    type: "boolean",
    defaultsTo: false,
  } as unknown as boolean,

  /**
   * Суммарное число попыток доставки по каналам (успешные + неудачные),
   * накапливается при первичной доставке и эскалациях. Используется для лимита водопада.
   */
  deliveryAttempts: {
    type: "number",
    defaultsTo: 0,
  } as unknown as number,

  badge: {
    type: "string",
    isIn: ["info", "error"],
    defaultsTo: "info",
  } as unknown as "info" | "error",

  createdAt: {
    type: "number",
  } as unknown as number,

  updatedAt: {
    type: "number",
  } as unknown as number,
};

type attributes = typeof attributes;
interface Notification extends RequiredField<OptionalAll<attributes>, null>, ORM {}
export interface NotificationRecord extends RequiredField<OptionalAll<attributes>, null>, ORM {}

let Model = {
  beforeCreate(init: NotificationRecord, cb: (err?: string) => void) {
    if (!init.id) {
      init.id = uuid();
    }
    cb();
  },

  async log(criteria: CriteriaQuery<NotificationRecord>, level: NotificationLogLevel, module: string, message: string, ...data: any[]): Promise<void> {
    return NotificationLogHelper.log(criteria, level, module, message, ...data);
  },
};

module.exports = {
  primaryKey: "id",
  attributes: attributes,
  ...Model,
};

declare global {
  const Notification: typeof Model & ORMModel<NotificationRecord, "readAt" | "data" | "channels" | "requestedChannels" | "logs" | "spentCost" | "important" | "deliveryAttempts">;
}
