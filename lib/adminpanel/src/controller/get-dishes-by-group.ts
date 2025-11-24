export default async function GetDishesByGroupController(req: any, res: any) {
    try {
        const { config } = req.adminizer || {};
        if (config?.auth?.enable && !req.user) {
            return res.redirect(`${config.routePrefix}/model/userap/login`);
        } else if (req.adminizer?.accessRightsHelper && !req.adminizer.accessRightsHelper.hasPermission(`stock-manager`, req.user)) {
            return res.sendStatus(403);
        }

        const groupId = req.query.group;
        if (!groupId) {
            return res.status(400).json({ error: 'Group ID is required' });
        }

        const where: any = {
            // isDeleted: false,
            parentGroup: groupId
        };

        const dishes = await Dish.find({ where }).populate('images');

        // Map minimal fields for client
        const results = dishes.map((d: any) => ({
            id: d.id,
            name: d.name,
            code: d.code,
            price: d.price,
            visible: d.visible ?? true, // Default to true if undefined/null
            isDeleted: d.isDeleted ?? false, // Default to false if undefined/null
            balance: d.balance,
        }));

        return res.json({ results });
    } catch (error) {
        sails.log.error('Get dishes by group error', error);
        return res.status(500).json({ error: String(error) });
    }
}
