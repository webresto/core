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
    const result = settings.map((s: any) => {
      // process.env outranks the DB (see Settings.use), so a stored value can be dead
      // weight. Report the effective value and flag it, instead of showing the UI one
      // thing while every Settings.get() consumer reads another.
      const env = Settings.envOverride(s);
      const effectiveValue = env.active ? (env.valid ? env.value : null) : s.value;
      return {
        id: s.id,
        key: s.key,
        name: s.name || null,
        description: s.description || null,
        tooltip: s.tooltip || null,
        type: s.type,
        secret: s.secret ?? false,
        hasValue: effectiveValue !== null && effectiveValue !== undefined,
        value: s.secret ? null : effectiveValue,
        defaultValue: s.secret ? null : s.defaultValue,
        jsonSchema: getSettingSchema(s),
        uiSchema: s.uiSchema || null,
        readOnly: s.readOnly ?? false,
        isRequired: s.isRequired ?? false,
        restartRequired: s.restartRequired ?? false,
        module: s.module || null,
        // active: pinned by an environment variable, so it cannot be edited here.
        // valid:false means that variable fails the schema — the setting reads as empty.
        envOverride: env.active ? { valid: env.valid } : null,
      };
    });
    return res.json(result);
  } catch (e) {
    sails.log.error('GetSettingsController error', e);
    return res.status(500).json({ error: t('Internal server error') });
  }
}
