import { CriteriaQuery } from "../interfaces/ORMModel";

export type OrderLogLevel = "info" | "warn" | "error" | "debug";

export interface OrderLogEntry {
  timestamp: string;
  level: OrderLogLevel;
  module: string;
  message: string;
  data?: any;
}

// In-memory log storage (Map mode)
const orderLogsMap = new Map<string, OrderLogEntry[]>();
const ORDER_LOGS_MAP_MAX_ORDERS = 64;

// Debounce buffer for DB log writes
const ORDER_LOG_DEBOUNCE_MS = 5000;
const orderLogBuffer = new Map<string, OrderLogEntry[]>();
const orderLogTimers = new Map<string, ReturnType<typeof setTimeout>>();

async function flushOrderLogs(orderId: string): Promise<void> {
  const entries = orderLogBuffer.get(orderId);
  orderLogBuffer.delete(orderId);
  orderLogTimers.delete(orderId);
  if (!entries || entries.length === 0) return;

  try {
    const order = await Order.findOne({ id: orderId });
    if (!order) return;
    const logs = order.logs || [];
    logs.push(...entries);
    await Order.update({ id: orderId }, { logs }).fetch();
  } catch (e) {
    sails.log.error(`Order.log flush error for order [${orderId}]`, e);
  }
}

export default class OrderLogHelper {

  /**
   * Write a log entry for an order.
   * Always emits "core:order-log" regardless of settings.
   * Controlled by ORDER_LOG_DISABLE (skip write) and ORDER_LOG_USE_MAP (store in memory).
   * DB writes are debounced (5s) to batch multiple entries.
   */
  static async log(criteria: CriteriaQuery<any>, level: OrderLogLevel, module: string, message: string, ...data: any[]): Promise<void> {
    const order = await Order.findOne(criteria);
    if (!order) {
      sails.log.warn(`Order.log: order not found`, criteria);
      return;
    }

    const logEntry: OrderLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      module,
      message,
      ...(data.length > 0 ? { data: data.length === 1 ? data[0] : data } : {})
    };

    // Always emit regardless of settings
    emitter.emit("core:order-log", order, logEntry);

    // Check if logging is disabled
    const disabled = await Settings.get("ORDER_LOG_DISABLE");
    if (disabled) {
      return;
    }

    // Check if we should use in-memory Map
    const useMap = await Settings.get("ORDER_LOG_USE_MAP");
    if (useMap) {
      const orderId = order.id;
      if (!orderLogsMap.has(orderId)) {
        // Evict oldest if over limit
        if (orderLogsMap.size >= ORDER_LOGS_MAP_MAX_ORDERS) {
          const oldestKey = orderLogsMap.keys().next().value;
          orderLogsMap.delete(oldestKey);
        }
        orderLogsMap.set(orderId, []);
      }
      orderLogsMap.get(orderId).push(logEntry);
      return;
    }

    // Write to DB with debounce (accumulate entries, flush after 5s idle)
    const orderId = order.id;
    if (!orderLogBuffer.has(orderId)) {
      orderLogBuffer.set(orderId, []);
    }
    orderLogBuffer.get(orderId).push(logEntry);

    // Reset debounce timer
    if (orderLogTimers.has(orderId)) {
      clearTimeout(orderLogTimers.get(orderId));
    }
    orderLogTimers.set(orderId, setTimeout(() => flushOrderLogs(orderId), ORDER_LOG_DEBOUNCE_MS));
  }

  /**
   * Check emitter results for errors/timeouts and log them into the order log.
   */
  private static async checkResults(criteria: CriteriaQuery<any>, eventName: string, results: { id: string; state: string; error?: any }[]): Promise<void> {
    if (!results || !results.length) return;
    for (const r of results) {
      if (r.state === "error") {
        await OrderLogHelper.log(criteria, "error", r.id || "emitter", `Emitter [${eventName}] handler error`, { handler: r.id, error: r.error?.message || r.error });
      } else if (r.state === "timeout") {
        await OrderLogHelper.log(criteria, "warn", r.id || "emitter", `Emitter [${eventName}] handler timeout`, { handler: r.id });
      }
    }
  }

  /**
   * Await emitter.emit and automatically log any handler errors/timeouts.
   * Returns the results array from emitter.emit.
   */
  static async emitAndLog(criteria: CriteriaQuery<any>, eventName: string, ...args: any[]): Promise<any[]> {
    const results = await (emitter as any).emit(eventName, ...args);
    await OrderLogHelper.checkResults(criteria, eventName, results);
    return results;
  }

  /**
   * Get logs for an order. Reads from Map or DB depending on ORDER_LOG_USE_MAP setting.
   * Flushes pending debounce buffer before reading from DB.
   */
  static async getLogs(criteria: CriteriaQuery<any>): Promise<OrderLogEntry[]> {
    const useMap = await Settings.get("ORDER_LOG_USE_MAP");

    if (useMap) {
      const order = await Order.findOne(criteria);
      if (!order) return [];
      return orderLogsMap.get(order.id) || [];
    }

    const order = await Order.findOne(criteria);
    if (!order) return [];

    // Flush pending buffer before reading
    if (orderLogBuffer.has(order.id)) {
      clearTimeout(orderLogTimers.get(order.id));
      await flushOrderLogs(order.id);
      const freshOrder = await Order.findOne({ id: order.id });
      return freshOrder?.logs || [];
    }

    return order.logs || [];
  }
}
