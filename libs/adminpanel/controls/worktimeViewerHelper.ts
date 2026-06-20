import { WorkTime } from "@webresto/worktime";

export type ViewerDay =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export interface ViewerWorktimeBase {
  start: string;
  stop: string;
  break?: string;
}

export interface ViewerWorktimeRecord extends ViewerWorktimeBase {
  index: number;
  dayOfWeek: ViewerDay[];
  selfService?: ViewerWorktimeBase;
  raw: unknown;
}

const DAYS: ViewerDay[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const DAY_ABBR: Record<ViewerDay, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

function normalizeBase(candidate: { [k: string]: unknown }): ViewerWorktimeBase {
  return {
    start: typeof candidate.start === "string" ? candidate.start : "",
    stop: typeof candidate.stop === "string" ? candidate.stop : "",
    break: typeof candidate.break === "string" ? candidate.break : undefined,
  };
}

export function normalizeWorktime(input: unknown): ViewerWorktimeRecord[] {
  // worktime is stored as WorkTime[] on Dish/Group/Promotion, but as a single
  // WorkTime object on Place/Maintenance — accept both shapes.
  const list = Array.isArray(input)
    ? input
    : input && typeof input === "object"
      ? [input]
      : [];

  return list.map((item: unknown, index: number): ViewerWorktimeRecord => {
    const fallback: ViewerWorktimeRecord = {
      index,
      dayOfWeek: [],
      start: "",
      stop: "",
      raw: item,
    };

    if (typeof item !== "object" || item === null) {
      return fallback;
    }

    const candidate = item as Partial<WorkTime> & { [k: string]: unknown };
    const dayOfWeek = Array.isArray(candidate.dayOfWeek)
      ? candidate.dayOfWeek.filter((d): d is ViewerDay => DAYS.includes(d as ViewerDay))
      : [];

    const selfServiceRaw = candidate.selfService;
    const selfService =
      selfServiceRaw && typeof selfServiceRaw === "object"
        ? normalizeBase(selfServiceRaw as unknown as { [k: string]: unknown })
        : undefined;

    return {
      index,
      dayOfWeek,
      ...normalizeBase(candidate),
      selfService,
      raw: item,
    };
  });
}

export function filterWorktime(
  records: ViewerWorktimeRecord[],
  days: Set<ViewerDay>,
  search: string
): ViewerWorktimeRecord[] {
  const query = search.trim().toLowerCase();

  return records.filter((item: ViewerWorktimeRecord) => {
    if (item.dayOfWeek.length && !item.dayOfWeek.some((d) => days.has(d))) {
      return false;
    }

    if (!query) {
      return true;
    }

    const serialized = `${item.dayOfWeek.join(" ")} ${item.start} ${item.stop} ${item.break ?? ""} ${safeStringify(item.selfService)}`.toLowerCase();
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

export function summarizeWorktime(worktime: unknown): string {
  const normalized = normalizeWorktime(worktime);

  if (normalized.length === 0) {
    return "Не задано";
  }

  return normalized
    .map((item: ViewerWorktimeRecord) => {
      const days = item.dayOfWeek.length
        ? item.dayOfWeek.map((d) => DAY_ABBR[d]).join("/")
        : "—";
      const range = item.start && item.stop ? `${item.start}–${item.stop}` : "—";
      return `${days} ${range}`;
    })
    .join("; ");
}
