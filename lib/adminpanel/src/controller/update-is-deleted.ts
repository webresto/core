import { buildAuditDiff, getAuditActor, logAuditEvent } from "../../../auditLog";

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
        const actor = getAuditActor(req);

        logAuditEvent("admin.stock-manager", "request", {
            actor,
            id,
            model,
            isDeleted: isDeleted ?? null,
            enable: enable ?? null,
        });

        const isDishEnableUpdate = model === 'dish' && typeof enable === 'boolean';
        const isLegacyDeleteUpdate = typeof isDeleted === 'boolean';

        if (!id || !model || (!isDishEnableUpdate && !isLegacyDeleteUpdate)) {
            logAuditEvent("admin.stock-manager", "invalid-parameters", {
                actor,
                id: id ?? null,
                model: model ?? null,
                isDeleted: isDeleted ?? null,
                enable: enable ?? null,
            });
            return res.status(400).json({ error: t('Invalid parameters') });
        }

        if (model === 'dish' && isDishEnableUpdate) {
            const before = await Dish.findOne({ id });
            // updateOne runs the model's afterUpdate - a storefront is told
            const after = await Dish.updateOne({ id }, { enable });
            logAuditEvent("admin.stock-manager", "dish-enable-updated", {
                actor,
                dishId: id,
                dishName: after?.name ?? before?.name ?? null,
                ...buildAuditDiff(before, after),
            });
        } else if (model === 'dish') {
            const before = await Dish.findOne({ id });
            const after = await Dish.updateOne({ id }, { isDeleted });
            logAuditEvent("admin.stock-manager", "dish-deletion-updated", {
                actor,
                dishId: id,
                dishName: after?.name ?? before?.name ?? null,
                ...buildAuditDiff(before, after),
            });
        } else if (model === 'group') {
            const before = await Group.findOne({ id });
            const after = await Group.updateOne({ id }, { isDeleted });
            logAuditEvent("admin.stock-manager", "group-deletion-updated", {
                actor,
                groupId: id,
                groupName: after?.name ?? before?.name ?? null,
                ...buildAuditDiff(before, after),
            });
        } else {
            return res.status(400).json({ error: t('Invalid model type') });
        }

        return res.json({ success: true });
    } catch (error) {
        sails.log.error('Update isDeleted error', error);
        return res.status(500).json({ error: String(error) });
    }
}
