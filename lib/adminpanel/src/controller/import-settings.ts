import { describeSettingValueProblem, getSettingSchema } from './settings-schema';

interface ImportEntry {
  key: string;
  value: any;
}

interface ImportPayload {
  /** Preview mode: just diff, don't apply */
  preview?: boolean;
  /** Which keys to apply (if not preview) */
  keys?: string[];
  settings: ImportEntry[];
}

export default async function ImportSettingsController(req: any, res: any) {
  const t = (key: string) => req?.i18n?.__ ? req.i18n.__(key) : key;
  if (!req.user?.isAdministrator) {
    return res.sendStatus(403);
  }

  const body: ImportPayload = req.body;
  if (!Array.isArray(body?.settings)) {
    return res.status(400).json({ error: t('Invalid payload: settings array required') });
  }

  try {
    const current = await Settings.find();
    const currentMap: Record<string, any> = {};
    for (const s of current) {
      currentMap[s.key] = s;
    }

    // Build diff for every entry in the import file
    const diff: Array<Record<string, any>> = body.settings.map((entry: ImportEntry) => {
      const existing = currentMap[entry.key];
      if (!existing) {
        return { key: entry.key, status: 'not_found', importValue: entry.value, currentValue: undefined as any };
      }
      // An env-pinned setting cannot be imported: report it as locked so the UI offers
      // it the same way it offers a read-only one, and compare against the env value.
      const env = Settings.envOverride(existing);
      const locked = (existing.readOnly ?? false) || env.active;
      // A secret setting is write-only: its current value is never sent to the client,
      // so it also cannot be compared — such an entry is always offered as a change.
      if (existing.secret) {
        return {
          key: entry.key,
          status: 'changed',
          secret: true,
          currentValue: null as any,
          importValue: entry.value,
          readOnly: locked,
          envOverride: env.active,
          type: existing.type,
          name: existing.name || null,
        };
      }
      const currentVal = env.active
        ? (env.valid ? env.value : null)
        : (existing.value !== null && existing.value !== undefined ? existing.value : existing.defaultValue);
      const changed = JSON.stringify(currentVal) !== JSON.stringify(entry.value);
      return {
        key: entry.key,
        status: changed ? 'changed' : 'unchanged',
        currentValue: currentVal,
        importValue: entry.value,
        readOnly: locked,
        envOverride: env.active,
        type: existing.type,
        name: existing.name || null,
      };
    });

    // Preview mode — just return diff
    if (body.preview) {
      return res.json({ diff });
    }

    // Apply mode — apply only selected keys
    const keysToApply = Array.isArray(body.keys) ? body.keys : [];
    if (keysToApply.length === 0) {
      return res.status(400).json({ error: t('No keys selected for import') });
    }

    const results: Array<{ key: string; status: string; error?: string }> = [];

    for (const entry of body.settings) {
      if (!keysToApply.includes(entry.key)) continue;

      const existing = currentMap[entry.key];
      if (!existing) {
        results.push({ key: entry.key, status: 'skipped', error: t('Setting not found in DB') });
        continue;
      }
      if (existing.readOnly) {
        results.push({ key: entry.key, status: 'skipped', error: t('Setting is read-only') });
        continue;
      }

      // Same rule as the single-setting update: env pins the value, so importing one
      // would only write dead weight into the DB.
      if (Settings.envOverride(existing).active) {
        results.push({ key: entry.key, status: 'skipped', error: t('Setting is set via an environment variable and cannot be changed here') });
        continue;
      }

      try {
        const jsonSchema = getSettingSchema(existing);
        const problem = describeSettingValueProblem(existing, entry.value, t);
        if (problem) {
          results.push({ key: entry.key, status: 'error', error: problem });
          continue;
        }
        await Settings.set(entry.key as any, { value: entry.value, ...(jsonSchema ? { jsonSchema } : {}) } as any);
        results.push({ key: entry.key, status: 'applied' });
      } catch (err: any) {
        results.push({ key: entry.key, status: 'error', error: err?.message || String(err) });
      }
    }

    return res.json({ results });
  } catch (e) {
    sails.log.error('ImportSettingsController error', e);
    return res.status(500).json({ error: t('Internal server error') });
  }
}
