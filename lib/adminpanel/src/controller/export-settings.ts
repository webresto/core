import { hasAccess } from "./marketing-helpers";
import { dumpSettings } from "../../../settings/view";

export default async function ExportSettingsController(req: any, res: any) {
  const t = (key: string) => req?.i18n?.__ ? req.i18n.__(key) : key;
  if (!hasAccess(req, res, "settings-manager")) return;

  try {
    // Secrets are left out of the file by `dumpSettings`, which the mobile export also uses (C24).
    const exportData = await dumpSettings();
    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="settings-${new Date().toISOString().slice(0, 10)}.json"`);
    return res.send(JSON.stringify(exportData, null, 2));
  } catch (e) {
    sails.log.error('ExportSettingsController error', e);
    return res.status(500).json({ error: t('Internal server error') });
  }
}
