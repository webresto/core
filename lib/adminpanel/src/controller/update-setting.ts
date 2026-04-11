export default async function UpdateSettingController(req: any, res: any) {
  if (!req.user?.isAdministrator) {
    return res.sendStatus(403);
  }

  const { key } = req.params;
  if (!key) return res.status(400).json({ error: 'key is required' });

  try {
    const setting = await Settings.findOne!({ key });
    if (!setting) return res.status(404).json({ error: 'Setting not found' });

    if (setting.readOnly) {
      return res.status(403).json({ error: 'Setting is read-only' });
    }

    const { value } = req.body;

    const updated = await Settings.set(key as any, { value } as any);
    if (!updated) {
      return res.status(400).json({ error: 'Validation failed. Check schema or value.' });
    }

    return res.json({
      id: updated.id,
      key: updated.key,
      value: updated.value,
      defaultValue: updated.defaultValue,
      type: updated.type,
    });
  } catch (e) {
    sails.log.error('UpdateSettingController error', e);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
