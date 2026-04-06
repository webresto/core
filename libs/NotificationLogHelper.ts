import { CriteriaQuery } from "../interfaces/ORMModel";

export type NotificationLogLevel = "info" | "warn" | "error" | "debug";

export interface NotificationLogEntry {
  timestamp: string;
  level: NotificationLogLevel;
  module: string;
  message: string;
  data?: any;
}

// Debounce buffer for DB log writes
const NOTIFICATION_LOG_DEBOUNCE_MS = 5000;
const notificationLogBuffer = new Map<string, NotificationLogEntry[]>();
const notificationLogTimers = new Map<string, ReturnType<typeof setTimeout>>();

async function flushNotificationLogs(notificationId: string): Promise<void> {
  const entries = notificationLogBuffer.get(notificationId);
  notificationLogBuffer.delete(notificationId);
  notificationLogTimers.delete(notificationId);
  if (!entries || entries.length === 0) return;

  try {
    const notification = await Notification.findOne({ id: notificationId });
    if (!notification) return;
    const logs = (notification.logs as NotificationLogEntry[]) || [];
    logs.push(...entries);
    await (Notification.update({ id: notificationId }, { logs }) as any).meta({ skipAllLifecycleCallbacks: true }).fetch();
  } catch (e) {
    sails.log.error(`Notification.log flush error for notification [${notificationId}]`, e);
  }
}

export default class NotificationLogHelper {

  /**
   * Write a log entry for a notification.
   * Always emits "core:notification-log" regardless of settings.
   * Controlled by NOTIFICATION_LOG_DISABLE (skip write).
   * DB writes are debounced (5s) to batch multiple entries.
   */
  static async log(criteria: CriteriaQuery<any>, level: NotificationLogLevel, module: string, message: string, ...data: any[]): Promise<void> {
    const notification = await Notification.findOne(criteria);
    if (!notification) {
      sails.log.warn(`Notification.log: notification not found`, criteria);
      return;
    }

    const logEntry: NotificationLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      module,
      message,
      ...(data.length > 0 ? { data: data.length === 1 ? data[0] : data } : {})
    };

    // Always emit regardless of settings
    emitter.emit("core:notification-log", notification, logEntry);

    const disabled = await Settings.get("NOTIFICATION_LOG_DISABLE");
    if (disabled) {
      return;
    }

    const notificationId = notification.id;
    if (!notificationLogBuffer.has(notificationId)) {
      notificationLogBuffer.set(notificationId, []);
    }
    notificationLogBuffer.get(notificationId).push(logEntry);

    if (notificationLogTimers.has(notificationId)) {
      clearTimeout(notificationLogTimers.get(notificationId));
    }
    notificationLogTimers.set(notificationId, setTimeout(() => flushNotificationLogs(notificationId), NOTIFICATION_LOG_DEBOUNCE_MS));
  }
}
