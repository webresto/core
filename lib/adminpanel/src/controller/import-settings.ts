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
  if (!req.user?.isAdministrator) {
    return res.sendStatus(403);
  }

  const body: ImportPayload = req.body;
  if (!Array.isArray(body?.settings)) {
    return res.status(400).json({ error: 'Invalid payload: settings array required' });
  }

  try {
    const current = await Settings.find();
    const currentMap: Record<string, any> = {};
    for (const s of current) {
      currentMap[s.key] = s;
    }

    // Build diff for every entry in the import file
    const diff = body.settings.map((entry: ImportEntry) => {
      const existing = currentMap[entry.key];
      if (!existing) {
        return { key: entry.key, status: 'not_found', importValue: entry.value, currentValue: undefined };
      }
      const currentVal = existing.value !== null && existing.value !== undefined
        ? existing.value
        : existing.defaultValue;
      const changed = JSON.stringify(currentVal) !== JSON.stringify(entry.value);
      return {
        key: entry.key,
        status: changed ? 'changed' : 'unchanged',
        currentValue: currentVal,
        importValue: entry.value,
        readOnly: existing.readOnly ?? false,
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
      return res.status(400).json({ error: 'No keys selected for import' });
    }

    const results: Array<{ key: string; status: string; error?: string }> = [];

    for (const entry of body.settings) {
      if (!keysToApply.includes(entry.key)) continue;

      const existing = currentMap[entry.key];
      if (!existing) {
        results.push({ key: entry.key, status: 'skipped', error: 'Setting not found in DB' });
        continue;
      }
      if (existing.readOnly) {
        results.push({ key: entry.key, status: 'skipped', error: 'read-only' });
        continue;
      }

      try {
        await Settings.set(entry.key as any, { value: entry.value } as any);
        results.push({ key: entry.key, status: 'applied' });
      } catch (err: any) {
        results.push({ key: entry.key, status: 'error', error: err?.message || String(err) });
      }
    }

    return res.json({ results });
  } catch (e) {
    sails.log.error('ImportSettingsController error', e);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
