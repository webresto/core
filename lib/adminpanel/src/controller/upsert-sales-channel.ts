import { hasManageAccess, mapChannel, stringArray, toNumber, slugify, parseJsonObject, sendRefusal } from "./sales-channels-helpers";
import { SalesChannelRegistry } from "../../../SalesChannelRegistry";
import { checkCanCreate, checkCanEnable, checkPlatforms, getInstalledProviderAppIds } from "../../../SalesChannelProviders";

/**
 * POST …/core/sales-channel   (create or update an instance)
 * Body: { id?, key?, title, type, enabled?, countries[], platforms[], concepts[],
 *         defaultConcept?, allowConceptSwitch?, url?, settings?, publicConfig?, sortOrder? }
 *
 * `key` identifies a backend client/integration. It must not be confused with frontend
 * runtime platform values such as "web", "pwa-ios", "pwa-android", "ios", or "android".
 * Uniqueness is enforced here (mirrors the promo-code precedent — no DB unique constraint).
 *
 * Provider rules (lib/SalesChannelProviders.ts), same as MCP sales-channel-upsert:
 *  - create only for an available type whose provider is alive, respecting
 *    supportsMultipleInstances; the channel starts disabled, needs_setup, managedBy "operator";
 *  - `type`, `providerModule`, `managedBy` and `status` are never taken from the body;
 *  - switching on needs the provider to report `ready` (409 "Finish setup first");
 *  - a platform may belong to one channel only.
 */
export default async function UpsertSalesChannelController(req: any, res: any) {
  const t = (key: string) => (req?.i18n?.__ ? req.i18n.__(key) : key);
  try {
    if (!hasManageAccess(req, res)) return;

    const body = req.body || {};
    const id = String(body.id || "").trim();

    const title = String(body.title || "").trim();
    if (!title) return res.status(400).json({ error: t("Title is required") });

    const existing = id ? await SalesChannel.findOne({ id }) : null;
    if (id && !existing) return res.status(404).json({ error: t("Sales channel not found") });

    // Resolve the key: explicit key, else slug of title (on create), else keep existing.
    let key = slugify(String(body.key || "").trim());
    if (!key) key = existing ? existing.key : slugify(title);
    if (!key) return res.status(400).json({ error: t("Channel key is required") });

    // Enforce uniqueness of key across other records.
    const clash = await SalesChannel.findOne({ key });
    if (clash && clash.id !== existing?.id) {
      return res.status(409).json({ error: t("A sales channel with this key already exists") });
    }

    // The type picks the provider, so it is fixed once the channel exists.
    const requestedType = String(body.type || "").trim();
    if (existing && requestedType && requestedType !== existing.type) {
      return res.status(409).json({ error: t("Channel type cannot be changed") });
    }
    const type = existing ? existing.type : requestedType;
    if (!existing) {
      const refusal = await checkCanCreate(type);
      if (refusal) return sendRefusal(req, res, refusal);
    }
    const typeDef = SalesChannelRegistry.getType(type);

    const platforms = stringArray(body.platforms);
    const platformRefusal = await checkPlatforms(platforms, existing);
    if (platformRefusal) return sendRefusal(req, res, platformRefusal);

    const installed = await getInstalledProviderAppIds();
    // A new channel always starts off; an existing one keeps its switch unless the body sets it.
    const enabled = existing ? (body.enabled !== undefined ? Boolean(body.enabled) : existing.enabled === true) : false;
    let computed = null;
    if (existing && enabled && existing.enabled !== true) {
      const check = await checkCanEnable(existing, installed);
      if (check.refusal) return sendRefusal(req, res, check.refusal);
      computed = check.computed;
    }

    const concepts = stringArray(body.concepts);
    const defaultConceptRaw = String(body.defaultConcept || "").trim();
    const defaultConcept = defaultConceptRaw && (concepts.length === 0 || concepts.includes(defaultConceptRaw))
      ? defaultConceptRaw
      : null;

    const values: any = {
      key,
      title,
      enabled,
      countries: stringArray(body.countries),
      platforms,
      concepts,
      defaultConcept,
      allowConceptSwitch: body.allowConceptSwitch !== false,
      url: body.url ? String(body.url).trim() : null,
      settings: parseJsonObject(body.settings),
      publicConfig: parseJsonObject(body.publicConfig),
      sortOrder: toNumber(body.sortOrder),
    };

    let saved: any;
    if (existing) {
      saved = (await SalesChannel.update({ id: existing.id }, values).fetch())[0];
    } else {
      saved = await SalesChannel.create({
        ...values,
        type,
        providerModule: typeDef?.providerModule ?? null,
        managedBy: "operator",
        status: "needs_setup",
      }).fetch();
      computed = await SalesChannel.channelStatus(saved);
    }

    return res.json({ success: true, result: mapChannel(saved, { canManage: true, installed, computed, req }) });
  } catch (error) {
    sails.log.error("Upsert sales channel error", error);
    return res.status(500).json({ error: String(error) });
  }
}
