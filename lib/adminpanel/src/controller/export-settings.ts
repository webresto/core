export default async function ExportSettingsController(req: any, res: any) {
  if (!req.user?.isAdministrator) {
    return res.sendStatus(403);
  }

  try {
    const settings = await Settings.find().sort('key ASC');
    const exportData = {
      exportedAt: new Date().toISOString(),
      count: settings.length,
      settings: settings.map((s: any) => ({
        key: s.key,
        name: s.name || null,
        description: s.description || null,
        type: s.type,
        value: s.value,
        defaultValue: s.defaultValue,
        module: s.module || null,
      })),
    };

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="settings-${new Date().toISOString().slice(0, 10)}.json"`);
    return res.send(JSON.stringify(exportData, null, 2));
  } catch (e) {
    sails.log.error('ExportSettingsController error', e);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}
