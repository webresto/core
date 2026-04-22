export default async function GetSettingsController(req: any, res: any) {
  const t = (key: string) => req?.i18n?.__ ? req.i18n.__(key) : key;
  if (!req.user?.isAdministrator) {
    return res.sendStatus(403);
  }

  try {
    const settings = await Settings.find().sort('key ASC');
    const result = settings.map((s: any) => ({
      id: s.id,
      key: s.key,
      name: s.name || null,
      description: s.description || null,
      tooltip: s.tooltip || null,
      type: s.type,
      value: s.value,
      defaultValue: s.defaultValue,
      jsonSchema: s.jsonSchema || null,
      uiSchema: s.uiSchema || null,
      readOnly: s.readOnly ?? false,
      isRequired: s.isRequired ?? false,
      module: s.module || null,
    }));
    return res.json(result);
  } catch (e) {
    sails.log.error('GetSettingsController error', e);
    return res.status(500).json({ error: t('Internal server error') });
  }
}
