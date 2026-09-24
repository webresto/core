import { requireStockManagerAccess } from "./access-rights";
import { getStockProducts, requireStockPlaceAccess } from "./stock-place-items";

export default async function GetDishesByGroupController(req: any, res: any) {
    const t = (key: string) => req?.i18n?.__ ? req.i18n.__(key) : key;
    try {
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
        res.set('Surrogate-Control', 'no-store');

        if (!requireStockManagerAccess(req, res)) return;
        const placeId = await requireStockPlaceAccess(req, res);
        if (!placeId) return;

        const groupId = req.query.group;
        if (!groupId) {
            return res.status(400).json({ error: t('Group ID is required') });
        }

        const where: any = {
            isDeleted: false,
            parentGroup: groupId
        };

        const { results, mode } = await getStockProducts(placeId, where, 500);

        return res.json({ results, mode });
    } catch (error) {
        sails.log.error('Get dishes by group error', error);
        return res.status(500).json({ error: String(error) });
    }
}
