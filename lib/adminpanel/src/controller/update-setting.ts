import { getSettingSchema, validateSettingValue } from './settings-schema';

export default async function UpdateSettingController(req: any, res: any) {
  const t = (key: string) => req?.i18n?.__ ? req.i18n.__(key) : key;
  if (!req.user?.isAdministrator) {
    return res.sendStatus(403);
  }

  const { key } = req.params;
  if (!key) return res.status(400).json({ error: t('Key is required') });

  try {
    const setting = await Settings.findOne!({ key });
    if (!setting) return res.status(404).json({ error: t('Setting not found') });

    if (setting.readOnly) {
      return res.status(403).json({ error: t('Setting is read-only') });
    }

    const { value } = req.body;
    const jsonSchema = getSettingSchema(setting);

    if (!validateSettingValue(setting, value)) {
      return res.status(400).json({ error: t('Validation failed. Check schema or value.') });
    }

    const updated = await Settings.set(key as any, { value, ...(jsonSchema ? { jsonSchema } : {}) } as any);
    if (!updated) {
      return res.status(400).json({ error: t('Validation failed. Check schema or value.') });
    }

    // A secret setting is writable but never readable: echo back only that it is set.
    return res.json({
      id: updated.id,
      key: updated.key,
      secret: setting.secret ?? false,
      // The UI raises a "restart to apply" notice off this flag after a successful save.
      restartRequired: setting.restartRequired ?? false,
      hasValue: updated.value !== null && updated.value !== undefined,
      value: setting.secret ? null : updated.value,
      defaultValue: setting.secret ? null : updated.defaultValue,
      type: updated.type,
    });
  } catch (e) {
    sails.log.error('UpdateSettingController error', e);
    return res.status(500).json({ error: t('Internal server error') });
  }
}
