export default async function UpdateStockController(req: any, res: any) {
  const t = (key: string) => req?.i18n?.__ ? req.i18n.__(key) : key;
  try {
    const { config } = req.adminizer || {};
    if (config?.auth?.enable && !req.user) {
      return res.redirect(`${config.routePrefix}/model/userap/login`);
    } else if (req.adminizer?.accessRightsHelper && !req.adminizer.accessRightsHelper.hasPermission(`stock-manager`, req.user)) {
      return res.sendStatus(403);
    }

    const { id, balance } = req.body;

    if (!id || typeof balance !== 'number') {
      return res.status(400).json({ error: t('Invalid id or balance') });
    }

    const updatedDish = await Dish.updateOne({ id }, { balance });

    if (!updatedDish) {
      return res.status(404).json({ error: t('Dish not found') });
    }

    return res.json({ success: true, dish: { id: updatedDish.id, balance: updatedDish.balance } });
  } catch (error) {
    sails.log.error('Update stock error', error);
    return res.status(500).json({ error: String(error) });
  }
}
