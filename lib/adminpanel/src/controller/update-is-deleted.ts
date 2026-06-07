export default async function UpdateIsDeletedController(req: any, res: any) {
    const t = (key: string) => req?.i18n?.__ ? req.i18n.__(key) : key;
    try {
        const { config } = req.adminizer || {};
        if (config?.auth?.enable && !req.user) {
            return res.redirect(`${config.routePrefix}/model/userap/login`);
        } else if (req.adminizer?.accessRightsHelper && !req.adminizer.accessRightsHelper.hasPermission(`stock-manager`, req.user)) {
            return res.sendStatus(403);
        }

        const { id, model, isDeleted, enable } = req.body;

        console.log('[UpdateIsDeleted] Request:', { id, model, isDeleted, enable });

        const isDishEnableUpdate = model === 'dish' && typeof enable === 'boolean';
        const isLegacyDeleteUpdate = typeof isDeleted === 'boolean';

        if (!id || !model || (!isDishEnableUpdate && !isLegacyDeleteUpdate)) {
            console.log('[UpdateIsDeleted] Invalid parameters');
            return res.status(400).json({ error: t('Invalid parameters') });
        }

        if (model === 'dish' && isDishEnableUpdate) {
            await Dish.update({ id }, { enable });
            console.log('[UpdateIsDeleted] Updated dish:', id, 'enable:', enable);
        } else if (model === 'dish') {
            await Dish.update({ id }, { isDeleted });
            console.log('[UpdateIsDeleted] Updated dish:', id, 'isDeleted:', isDeleted);
        } else if (model === 'group') {
            await Group.update({ id }, { isDeleted });
            console.log('[UpdateIsDeleted] Updated group:', id, 'isDeleted:', isDeleted);
        } else {
            return res.status(400).json({ error: t('Invalid model type') });
        }

        return res.json({ success: true });
    } catch (error) {
        sails.log.error('Update isDeleted error', error);
        return res.status(500).json({ error: String(error) });
    }
}
