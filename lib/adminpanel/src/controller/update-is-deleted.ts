export default async function UpdateIsDeletedController(req: any, res: any) {
    try {
        const { config } = req.adminizer || {};
        if (config?.auth?.enable && !req.user) {
            return res.redirect(`${config.routePrefix}/model/userap/login`);
        } else if (req.adminizer?.accessRightsHelper && !req.adminizer.accessRightsHelper.hasPermission(`stock-manager`, req.user)) {
            return res.sendStatus(403);
        }

        const { id, model, isDeleted } = req.body;

        console.log('[UpdateIsDeleted] Request:', { id, model, isDeleted });

        if (!id || !model || typeof isDeleted !== 'boolean') {
            console.log('[UpdateIsDeleted] Invalid parameters');
            return res.status(400).json({ error: 'Invalid parameters' });
        }

        if (model === 'dish') {
            await Dish.update({ id }, { isDeleted });
            console.log('[UpdateIsDeleted] Updated dish:', id, 'isDeleted:', isDeleted);
        } else if (model === 'group') {
            await Group.update({ id }, { isDeleted });
            console.log('[UpdateIsDeleted] Updated group:', id, 'isDeleted:', isDeleted);
        } else {
            return res.status(400).json({ error: 'Invalid model type' });
        }

        return res.json({ success: true });
    } catch (error) {
        sails.log.error('Update isDeleted error', error);
        return res.status(500).json({ error: String(error) });
    }
}
