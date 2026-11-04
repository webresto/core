/**
 * The coercions the marketing layer reads records with. They were written for the controllers of the admin panel
 * (`lib/adminpanel/src/controller/marketing-helpers.ts`, which re-exports them) and moved here when the phone needed
 * the same answers: `json` columns come back parsed from Postgres and as text from some drivers, and a number of a
 * form arrives as a string.
 */

export function toNumber(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export function parseJsonArray(value: unknown): any[] {
  if (Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      /* not json: no array */
    }
  }
  return [];
}

export function parseJsonObject(value: unknown): any {
  if (value && typeof value === "object" && !Array.isArray(value)) return value;
  if (typeof value === "string" && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch {
      /* not json: no object */
    }
  }
  return null;
}

/** Local YYYY-MM-DD of an epoch-ms moment, in the timezone of the process - the restaurant's day. */
export function dayKey(ms: number): string {
  const day = new Date(ms);
  if (Number.isNaN(day.getTime())) return "";
  return `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, "0")}-${String(day.getDate()).padStart(2, "0")}`;
}

/**
 * A switch written before the switch existed. Records created then have no value, and they work: the web reads them
 * so (`get-promocodes.ts`), and a check of `=== true` would turn off codes and promotions that are running.
 */
export function isOn(value: unknown): boolean {
  return value !== false;
}
