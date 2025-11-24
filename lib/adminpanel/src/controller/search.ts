export default async function StockManagerSearchController(req: any, res: any) {
  try {
    const { config } = req.adminizer || {};
    if (config?.auth?.enable && !req.user) {
      return res.redirect(`${config.routePrefix}/model/userap/login`);
    } else if (req.adminizer?.accessRightsHelper && !req.adminizer.accessRightsHelper.hasPermission(`stock-manager`, req.user)) {
      return res.sendStatus(403);
    }

    const q = (req.query.q || '').toString().trim();
    if (!q) return res.json({ results: [] });

    const where: any = { 
      // isDeleted: false 
    };

    // Search by name or code (contains)
    where.or = [
      { name: { contains: q } },
      { code: { contains: q } }
    ];

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
    sails.log.error('StockManager search error', error);
    return res.status(500).json({ error: String(error) });
  }
}
