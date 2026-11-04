import { hasAccess } from "./marketing-helpers";
import { listSettings } from "../../../settings/view";

export default async function GetSettingsController(req: any, res: any) {
  const t = (key: string) => req?.i18n?.__ ? req.i18n.__(key) : key;
  if (!hasAccess(req, res, "settings-manager")) return;

  try {
    // Every rule about what may be shown — the effective value, the env pin, a secret that stays in
    // the database — is in `lib/settings/view.ts`, so the mobile API answers the same (C24).
    return res.json(await listSettings());
  } catch (e) {
    sails.log.error('GetSettingsController error', e);
    return res.status(500).json({ error: t('Internal server error') });
  }
}
