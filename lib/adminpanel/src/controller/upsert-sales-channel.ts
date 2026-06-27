import { hasAccess, mapChannel, stringArray, toNumber, slugify, parseJsonObject } from "./sales-channels-helpers";
import { SalesChannelRegistry } from "../../../../libs/SalesChannelRegistry";

const VALID_STATUS = ["draft", "needs_setup", "ready", "disabled", "error"];

/**
 * POST …/core/sales-channel   (create or update an instance)
 * Body: { id?, key?, title, type, providerModule?, enabled?, status?, countries[], platforms[],
 *         concepts[], defaultConcept?, allowConceptSwitch?, url?, settings?, publicConfig?, sortOrder? }
 *
 * `key` identifies a backend client/integration. It must not be confused with frontend
 * runtime platform values such as "web", "pwa-ios", "pwa-android", "ios", or "android".
 * Uniqueness is enforced here (mirrors the promo-code precedent — no DB unique constraint).
 */
export default async function UpsertSalesChannelController(req: any, res: any) {
  const t = (key: string) => (req?.i18n?.__ ? req.i18n.__(key) : key);
  try {
    if (!hasAccess(req, res)) return;

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

    // Validate type against the registry, falling back to "custom".
    let type = String(body.type || existing?.type || "custom").trim();
    if (!SalesChannelRegistry.getType(type) && type !== "legacy") type = "custom";
    const typeDef = SalesChannelRegistry.getType(type);

    const enabled = Boolean(body.enabled);
    let status = String(body.status || "").trim();
    if (!VALID_STATUS.includes(status)) {
      status = enabled ? "ready" : (existing?.status && existing.status !== "ready" ? existing.status : "draft");
    }

    const concepts = stringArray(body.concepts);
    const defaultConceptRaw = String(body.defaultConcept || "").trim();
    const defaultConcept = defaultConceptRaw && (concepts.length === 0 || concepts.includes(defaultConceptRaw))
      ? defaultConceptRaw
      : null;

    const values: any = {
      key,
      title,
      type,
      providerModule: body.providerModule ? String(body.providerModule).trim() : (typeDef?.providerModule ?? null),
      enabled,
      status,
      countries: stringArray(body.countries),
      platforms: stringArray(body.platforms),
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
      saved = await SalesChannel.create(values).fetch();
    }

    return res.json({ success: true, result: mapChannel(saved) });
  } catch (error) {
    sails.log.error("Upsert sales channel error", error);
    return res.status(500).json({ error: String(error) });
  }
}
