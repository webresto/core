export default async function GetStockItemsController(req: any, res: any) {
  try {
    const { config } = req.adminizer || {};
    if (config?.auth?.enable && !req.user) {
      return res.redirect(`${config.routePrefix}/model/userap/login`);
    } else if (req.adminizer?.accessRightsHelper && !req.adminizer.accessRightsHelper.hasPermission(`stock-manager`, req.user)) {
      return res.sendStatus(403);
    }

    const where: any = { isDeleted: false, balance: { '!=': -1 } };

    const dishes = await Dish.find({ where, limit: 50 }).populate('images');

    // Map minimal fields for client
    const results = dishes.map((d: any) => ({
      id: d.id,
      name: d.name,
      code: d.code,
      price: d.price,
      visible: d.visible,
      balance: d.balance,
    }));

    return res.json({ results });
  } catch (error) {
    sails.log.error('Get stock items error', error);
    return res.status(500).json({ error: String(error) });
  }
}