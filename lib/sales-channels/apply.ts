/**
 * Writing a sales channel: one function for the admin page, the MCP tools and the mobile API.
 *
 * `lib/SalesChannelProviders.ts` already holds the provider rules (`checkCanCreate`, `checkPlatforms`,
 * `checkCanEnable`); what lived twice — in `lib/adminpanel/src/controller/upsert-sales-channel.ts` and in
 * the `sales-channel-upsert` MCP tool — was everything around them: the uniqueness of `key`, the slug of a
 * title, "the type never changes", "a new channel starts disabled" and which fields may be taken from the
 * request at all. Two copies of that is two answers to "may I write this", so it is here now and every
 * caller writes the same way by construction.
 *
 * Refusals come back as `SalesChannelRefusal` (an English phrase that is an i18n key of the admin panel,
 * plus its `params` and `extra`), so the caller decides how to say it: 409 JSON on the page, an MCP error,
 * a `conflict` with a translated message for the phone.
 */

import slugifyLib from "slugify";
import { SalesChannelRegistry } from "../SalesChannelRegistry";
import {
  checkCanCreate,
  checkCanEnable,
  checkPlatforms,
  getInstalledProviderAppIds,
  type SalesChannelRefusal,
} from "../SalesChannelProviders";
import { jsonObject, stringArray } from "./view";
import type { SalesChannelRecord } from "../../models/SalesChannel";
import type { SalesChannelStatusResult } from "../../adapters";

/**
 * Slugify a free-text title into a stable channel key.
 *
 * `slugify` transliterates Cyrillic and other charmapped alphabets, so a title like "Сайт" becomes
 * "sajt" instead of an empty key. The same helper backs the Dish/Group slugs, and the admin page runs
 * it in the browser too, so the key the operator sees is the key that gets stored. Scripts outside the
 * charmap (CJK and the like) still slugify to "", and then the write is refused with
 * "Channel key is required" — the caller has to ask for a key by hand.
 */
export function slugifyChannelKey(value: string): string {
  return slugifyLib(String(value || ""), { lower: true, strict: true, locale: "en" })
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

/** What a request may carry. Anything else — `status`, `providerModule`, `managedBy`, `secretsRef` — is not taken. */
export interface ChannelInput {
  id?: string;
  key?: string;
  title?: string;
  /** Only on create: the type picks the provider and is fixed afterwards. */
  type?: string;
  enabled?: boolean;
  countries?: unknown;
  platforms?: unknown;
  concepts?: unknown;
  defaultConcept?: string | null;
  allowConceptSwitch?: boolean;
  url?: string | null;
  settings?: unknown;
  publicConfig?: unknown;
  sortOrder?: unknown;
}

export interface ApplyChannelOptions {
  /** `getInstalledProviderAppIds()` when the caller already read it for this request. */
  installed?: Set<string> | null;
}

export type ApplyChannelOutcome =
  | { ok: true; created: boolean; saved: SalesChannelRecord; computed: SalesChannelStatusResult | null; installed: Set<string> | null }
  | { ok: false; refusal: SalesChannelRefusal };

function refuse(status: number, error: string, extra?: Record<string, unknown>): { ok: false; refusal: SalesChannelRefusal } {
  return { ok: false, refusal: extra ? { status, error, extra } : { status, error } };
}

/**
 * Create or save a channel.
 *
 * A field the request does not name is left as it is — the provider's `settings` and `publicConfig`
 * are its own and no editor of them exists anywhere (neither on the page nor on the phone), so a save
 * of the title must not wipe them.
 */
export async function applyChannel(body: ChannelInput, options: ApplyChannelOptions = {}): Promise<ApplyChannelOutcome> {
  const given = (field: keyof ChannelInput) => body[field] !== undefined;

  const title = String(body.title ?? "").trim();
  if (!title) return refuse(400, "Title is required");

  const id = String(body.id || "").trim();
  const existing = id ? ((await SalesChannel.findOne({ id })) as SalesChannelRecord | null) : null;
  if (id && !existing) return refuse(404, "Sales channel not found");

  // The key: an explicit one, else the slug of the title on create, else the one it already has.
  let key = slugifyChannelKey(String(body.key || "").trim());
  if (!key) key = existing ? existing.key : slugifyChannelKey(title);
  if (!key) return refuse(400, "Channel key is required");

  const clash = await SalesChannel.findOne({ key });
  if (clash && clash.id !== existing?.id) return refuse(409, "A sales channel with this key already exists");

  // The type picks the provider, so it is fixed once the channel exists.
  const requestedType = String(body.type || "").trim();
  if (existing && requestedType && requestedType !== existing.type) return refuse(409, "Channel type cannot be changed");
  const type = existing ? existing.type : requestedType;
  if (!existing) {
    const refusal = await checkCanCreate(type);
    if (refusal) return { ok: false, refusal };
  }
  const typeDef = SalesChannelRegistry.getType(type);

  const platforms = given("platforms") ? stringArray(body.platforms) : stringArray(existing?.platforms);
  const platformRefusal = await checkPlatforms(platforms, existing);
  if (platformRefusal) return { ok: false, refusal: platformRefusal };

  const installed = options.installed !== undefined ? options.installed : await getInstalledProviderAppIds();
  // A new channel always starts off; an existing one keeps its switch unless the request sets it.
  const enabled = existing ? (given("enabled") ? Boolean(body.enabled) : existing.enabled === true) : false;
  let computed: SalesChannelStatusResult | null = null;
  if (existing && enabled && existing.enabled !== true) {
    const check = await checkCanEnable(existing, installed);
    if (check.refusal) return { ok: false, refusal: check.refusal };
    computed = check.computed;
  }

  const concepts = given("concepts") ? stringArray(body.concepts) : stringArray(existing?.concepts);
  const defaultConceptRaw = given("defaultConcept") ? String(body.defaultConcept || "").trim() : existing?.defaultConcept || "";
  const defaultConcept = defaultConceptRaw && (concepts.length === 0 || concepts.includes(defaultConceptRaw)) ? defaultConceptRaw : null;

  const values: any = {
    key,
    title,
    enabled,
    platforms,
    concepts,
    defaultConcept,
    countries: given("countries") ? stringArray(body.countries) : stringArray(existing?.countries),
    allowConceptSwitch: given("allowConceptSwitch") ? body.allowConceptSwitch !== false : existing?.allowConceptSwitch ?? true,
    url: given("url") ? String(body.url || "").trim() || null : existing?.url ?? null,
  };
  if (given("settings")) values.settings = jsonObject(body.settings);
  if (given("publicConfig")) values.publicConfig = jsonObject(body.publicConfig);
  if (given("sortOrder")) values.sortOrder = Number(body.sortOrder) || 0;

  if (existing) {
    const saved = (await SalesChannel.update({ id: existing.id }, values).fetch())[0] as SalesChannelRecord;
    return { ok: true, created: false, saved, computed, installed };
  }

  const saved = (await SalesChannel.create({
    ...values,
    type,
    providerModule: typeDef?.providerModule ?? null,
    managedBy: "operator",
    status: "needs_setup",
  }).fetch()) as SalesChannelRecord;
  return { ok: true, created: true, saved, computed: await SalesChannel.channelStatus(saved), installed };
}
