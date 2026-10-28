// The page "Scheduled maintenance" (maintenance-manager.jsx): a maintenance closes the site for orders while it is
// switched on and its period - none, or from-to - holds now (Maintenance.getActiveMaintenance).
import type { MaintenanceRecord } from "../../../../models/Maintenance";

export const MAINTENANCE_RIGHT = "maintenance-manager";

/** The error the page shows: a key of its messages. */
export class Refusal extends Error {}

/** the rows for the page, and which of them closes the site now */
export async function maintenancesForAdmin() {
  const rows: MaintenanceRecord[] = await Maintenance.find!({}).sort("startDate DESC");
  const active = await Maintenance.getActiveMaintenance();
  return {
    maintenances: rows.map(({ id, title, description, enable, startDate, stopDate }) => ({ id, title, description, enable, startDate, stopDate })),
    activeId: active?.id ?? null,
  };
}

/**
 * A maintenance's fields from the page, only those sent: the switch of the list sends `enable` alone. Empty texts and
 * dates are "" - the model's strings take no null; an empty bound of the period is an open one.
 */
export function maintenanceValues(body: any, creating: boolean): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  const has = (field: string) => creating || (body && Object.prototype.hasOwnProperty.call(body, field));
  if (has("title")) {
    const title = typeof body?.title === "string" ? body.title.trim() : "";
    if (!title) throw new Refusal("A maintenance needs a title");
    values.title = title;
  }
  if (has("description")) values.description = typeof body?.description === "string" ? body.description : "";
  if (has("enable")) values.enable = body?.enable === true;
  for (const field of ["startDate", "stopDate"]) {
    if (!has(field)) continue;
    const value = typeof body?.[field] === "string" ? body[field].trim() : "";
    if (value && Number.isNaN(new Date(value).getTime())) throw new Refusal("A date is wrong");
    values[field] = value ? new Date(value).toISOString() : "";
  }
  if (values.startDate && values.stopDate && String(values.startDate) > String(values.stopDate)) throw new Refusal("The end is before the start");
  return values;
}
