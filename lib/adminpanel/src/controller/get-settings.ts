import { getSettingSchema } from './settings-schema';

export default async function GetSettingsController(req: any, res: any) {
  const t = (key: string) => req?.i18n?.__ ? req.i18n.__(key) : key;
  if (!req.user?.isAdministrator) {
    return res.sendStatus(403);
  }

  try {
    const settings = await Settings.find().sort('key ASC');
    // A secret setting is write-only: the UI may set a new value, but the stored one
    // (token/password/key) is never sent to the client — only the fact that it is set.
    const result = settings.map((s: any) => ({
      id: s.id,
      key: s.key,
      name: s.name || null,
      description: s.description || null,
      tooltip: s.tooltip || null,
      type: s.type,
      secret: s.secret ?? false,
      hasValue: s.value !== null && s.value !== undefined,
      value: s.secret ? null : s.value,
      defaultValue: s.secret ? null : s.defaultValue,
      jsonSchema: getSettingSchema(s),
      uiSchema: s.uiSchema || null,
      readOnly: s.readOnly ?? false,
      isRequired: s.isRequired ?? false,
      restartRequired: s.restartRequired ?? false,
      module: s.module || null,
    }));
    return res.json(result);
  } catch (e) {
    sails.log.error('GetSettingsController error', e);
    return res.status(500).json({ error: t('Internal server error') });
  }
}
