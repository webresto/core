export default async function UpdateVisibilityController(req: any, res: any) {
    try {
        const { config } = req.adminizer || {};
        if (config?.auth?.enable && !req.user) {
            return res.redirect(`${config.routePrefix}/model/userap/login`);
        } else if (req.adminizer?.accessRightsHelper && !req.adminizer.accessRightsHelper.hasPermission(`stock-manager`, req.user)) {
            return res.sendStatus(403);
        }

        const { id, model, visible } = req.body;

        if (!id || !model || typeof visible !== 'boolean') {
            return res.status(400).json({ error: 'Invalid parameters' });
        }

        if (model === 'dish') {
            await Dish.update({ id }, { visible });
        } else if (model === 'group') {
            await Group.update({ id }, { visible });
        } else {
            return res.status(400).json({ error: 'Invalid model type' });
        }

        return res.json({ success: true });
    } catch (error) {
        sails.log.error('Update visibility error', error);
        return res.status(500).json({ error: String(error) });
    }
}
