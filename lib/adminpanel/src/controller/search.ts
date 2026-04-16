export default async function StockManagerSearchController(req: any, res: any) {
  try {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.set('Surrogate-Control', 'no-store');

    const { config } = req.adminizer || {};
    if (config?.auth?.enable && !req.user) {
      return res.redirect(`${config.routePrefix}/model/userap/login`);
    } else if (req.adminizer?.accessRightsHelper && !req.adminizer.accessRightsHelper.hasPermission(`stock-manager`, req.user)) {
      return res.sendStatus(403);
    }

    const q = (req.query.q || '').toString().trim();
    if (!q) return res.json({ results: [] });

    const where: any = {
      isDeleted: false
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
      enable: d.enable ?? true,
      visible: d.visible,
      balance: d.balance,
      isDeleted: d.isDeleted,
    }));

    return res.json({ results });
  } catch (error) {
    sails.log.error('StockManager search error', error);
    return res.status(500).json({ error: String(error) });
  }
}
