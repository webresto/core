import { hasAccess } from "./marketing-helpers";
import { applySetting } from "../../../settings/view";

export default async function UpdateSettingController(req: any, res: any) {
  const t = (key: string) => req?.i18n?.__ ? req.i18n.__(key) : key;
  if (!hasAccess(req, res, "settings-manager")) return;

  const { key } = req.params;
  if (!key) return res.status(400).json({ error: t('Key is required') });

  try {
    const applied = await applySetting(key, req.body?.value, t);
    if (!applied.ok) {
      // The three refusals that are not about the value keep their own codes; a value the schema
      // rejects is a 400 whose body is the sentence the page shows inline.
      const status = applied.reason === 'not_found' ? 404 : applied.reason === 'invalid' ? 400 : 403;
      return res.status(status).json({ error: applied.message });
    }
    // A secret is writable but never readable: `value` of such a setting comes back null, and the
    // page raises its "restart to apply" notice off `restartRequired`.
    return res.json(applied.item);
  } catch (e) {
    sails.log.error('UpdateSettingController error', e);
    return res.status(500).json({ error: t('Internal server error') });
  }
}
