// The page "Sign-in methods" (auth-methods.jsx): what the operator sees of an AuthMethod row and what he may change.
// The rows are made by the modules (AuthMethod.alive on boot); the page changes only the operator's fields of them.
import type { AuthMethodRecord } from "../../../../models/AuthMethod";

export const AUTH_METHODS_RIGHT = "auth-methods";

/** what a code sent to the phone may confirm; an identity provider - login and link, and the phone when it proves one */
const PHONE_PROOF_PURPOSES = ["login", "link", "verify:phone", "verify:phone_change", "verify:delete_account", "verify:link_identity", "verify:unlink_identity"];

/**
 * The purposes the page offers to tick for a row: those its kind can serve (as the defaults of AuthMethod.alive give
 * them) and those the row has - a module may declare its own.
 */
export function purposeOptions(row: AuthMethodRecord): string[] {
  const own = row.kind === "phone_proof" ? PHONE_PROOF_PURPOSES : ["login", "link", ...(row.canVerifyPhone ? ["verify:phone"] : [])];
  return [...new Set([...own, ...(Array.isArray(row.purposes) ? row.purposes : [])])];
}

/** a row for the page: without its secrets */
export function forAdmin(row: AuthMethodRecord) {
  const { config: _config, customData: _customData, ...rest } = row as any;
  return { ...rest, purposeOptions: purposeOptions(row) };
}

/** The error the page shows: a key of its messages. */
export class Refusal extends Error {}

const COLOR = /^#[0-9a-f]{3,8}$/i;
const COUNTRY = /^[A-Z]{2}$/;

/**
 * The operator's fields of a row from the page, only those sent: the switch of the list sends `enable` alone. Empty
 * texts are "" - the model's strings take no null.
 */
export function operatorValues(body: any, row: AuthMethodRecord, channels: string[]): Record<string, unknown> {
  const values: Record<string, unknown> = {};
  const has = (field: string) => body && Object.prototype.hasOwnProperty.call(body, field);
  const text = (field: string) => (typeof body[field] === "string" ? body[field].trim() : "");
  const count = (field: string) => {
    const value = Number(body[field] ?? 0);
    if (!Number.isInteger(value) || value < 0) throw new Refusal("A number: a whole one, 0 or more");
    return value;
  };

  if (has("enable")) values.enable = body.enable === true;
  for (const field of ["titleKey", "hintKey", "iconUrl"]) if (has(field)) values[field] = text(field);
  for (const field of ["buttonColor", "buttonTextColor"]) {
    if (!has(field)) continue;
    if (text(field) && !COLOR.test(text(field))) throw new Refusal("A colour: #rrggbb");
    values[field] = text(field);
  }
  if (has("purposes")) {
    const options = purposeOptions(row);
    const purposes = Array.isArray(body.purposes) ? body.purposes.filter((item: unknown) => options.includes(item as string)) : [];
    if (!purposes.length) throw new Refusal("Tick at least one purpose");
    values.purposes = purposes;
  }
  if (has("countries")) {
    const countries = Array.isArray(body.countries) ? body.countries.map((item: unknown) => String(item).trim().toUpperCase()).filter(Boolean) : [];
    if (!countries.every((item: string) => COUNTRY.test(item))) throw new Refusal("Countries: two-letter codes, e.g. RU, KZ");
    values.countries = [...new Set(countries)];
  }
  if (has("salesChannels")) {
    values.salesChannels = Array.isArray(body.salesChannels) ? body.salesChannels.filter((item: unknown) => channels.includes(item as string)) : [];
  }
  if (row.kind === "phone_proof") {
    for (const field of ["ttlSec", "resendAfterSec"]) if (has(field)) values[field] = count(field);
  }
  if (has("cost")) values.cost = count("cost");
  if (row.kind === "identity") {
    if (has("requirePhoneVerification")) values.requirePhoneVerification = body.requirePhoneVerification === true;
    if (has("maxPerUser")) {
      const empty = body.maxPerUser === null || body.maxPerUser === "";
      if (!empty && (!Number.isInteger(Number(body.maxPerUser)) || Number(body.maxPerUser) < 1)) throw new Refusal("A number: a whole one, 1 or more");
      values.maxPerUser = empty ? null : Number(body.maxPerUser);
    }
  }
  return values;
}
