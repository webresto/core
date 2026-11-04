import { hasAccess } from "./marketing-helpers";
import { applyImport, diffImport, type ImportEntry } from "../../../settings/view";

interface ImportPayload {
  /** Preview mode: just diff, don't apply */
  preview?: boolean;
  /** Which keys to apply (if not preview) */
  keys?: string[];
  settings: ImportEntry[];
}

export default async function ImportSettingsController(req: any, res: any) {
  const t = (key: string) => req?.i18n?.__ ? req.i18n.__(key) : key;
  if (!hasAccess(req, res, "settings-manager")) return;

  const body: ImportPayload = req.body;
  if (!Array.isArray(body?.settings)) {
    return res.status(400).json({ error: t('Invalid payload: settings array required') });
  }

  try {
    // Preview mode — just return diff. The same two functions answer the mobile transfer screen (C24).
    if (body.preview) return res.json({ diff: await diffImport(body.settings) });

    const keysToApply = Array.isArray(body.keys) ? body.keys : [];
    if (keysToApply.length === 0) {
      return res.status(400).json({ error: t('No keys selected for import') });
    }
    return res.json({ results: await applyImport(body.settings, keysToApply, t) });
  } catch (e) {
    sails.log.error('ImportSettingsController error', e);
    return res.status(500).json({ error: t('Internal server error') });
  }
}
