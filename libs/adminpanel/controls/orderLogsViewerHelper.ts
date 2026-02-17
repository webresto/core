import { OrderLogEntry, OrderLogLevel } from "../../OrderLogHelper";

export type ViewerLogLevel = OrderLogLevel;

export interface ViewerLogRecord {
  index: number;
  timestamp: string;
  level: ViewerLogLevel;
  module: string;
  message: string;
  data?: unknown;
  raw: unknown;
}

const LOG_LEVELS: ViewerLogLevel[] = ["debug", "info", "warn", "error"];

export function normalizeOrderLogs(input: unknown): ViewerLogRecord[] {
  if (!Array.isArray(input)) {
    return [];
  }

  return input.map((item: unknown, index: number): ViewerLogRecord => {
    const fallback: ViewerLogRecord = {
      index,
      timestamp: "unknown-time",
      level: "info",
      module: "unknown-module",
      message: String(item),
      raw: item,
    };

    if (typeof item !== "object" || item === null) {
      return fallback;
    }

    const candidate = item as Partial<OrderLogEntry> & { [k: string]: unknown };
    const level = typeof candidate.level === "string" && LOG_LEVELS.includes(candidate.level as ViewerLogLevel)
      ? candidate.level as ViewerLogLevel
      : "info";

    return {
      index,
      timestamp: typeof candidate.timestamp === "string" ? candidate.timestamp : "unknown-time",
      level,
      module: typeof candidate.module === "string" ? candidate.module : "unknown-module",
      message: typeof candidate.message === "string" ? candidate.message : "",
      data: candidate.data,
      raw: item,
    };
  });
}

export function filterOrderLogs(logs: ViewerLogRecord[], levels: Set<ViewerLogLevel>, search: string): ViewerLogRecord[] {
  const query = search.trim().toLowerCase();

  return logs.filter((item: ViewerLogRecord) => {
    if (!levels.has(item.level)) {
      return false;
    }

    if (!query) {
      return true;
    }

    const serialized = `${item.timestamp} ${item.level} ${item.module} ${item.message} ${safeStringify(item.data)}`.toLowerCase();
    return serialized.includes(query);
  });
}

export function safeStringify(data: unknown): string {
  if (data === undefined) {
    return "";
  }

  if (typeof data === "string") {
    return data;
  }

  try {
    return JSON.stringify(data, null, 2);
  } catch {
    return String(data);
  }
}

export function summarizeOrderLogs(logs: unknown): string {
  const normalized = normalizeOrderLogs(logs);

  if (normalized.length === 0) {
    return "Нет логов";
  }

  const counts = normalized.reduce((acc: Record<string, number>, item: ViewerLogRecord) => {
    acc[item.level] = (acc[item.level] || 0) + 1;
    return acc;
  }, {});

  return ["debug", "info", "warn", "error"]
    .map((level: string) => `${level}:${counts[level] || 0}`)
    .join(" ");
}
