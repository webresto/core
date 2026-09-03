import { requireStockManagerAccess } from "./access-rights";
import { requireStockPlaceAccess } from "./stock-place-items";

export default async function GetGroupsController(req: any, res: any) {
    if (!requireStockManagerAccess(req, res)) return;
    if (!(await requireStockPlaceAccess(req, res))) return;
    try {
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
        res.set('Pragma', 'no-cache');
        res.set('Expires', '0');
        res.set('Surrogate-Control', 'no-store');

        const parentId = req.query.parent || null;

        let groups;
        if (parentId) {
            groups = await Group.find({
                where: {
                    parentGroup: parentId,
                    isDeleted: false
                }
            });
        } else {
            // Fetch root groups (no parent)
            // Using Group.getMenuGroups might be too specific to menu logic (e.g. time validation), 
            // but for stock manager we probably want all visible groups structure.
            // Let's try to find groups with no parent first.
            groups = await Group.find({
                where: {
                    parentGroup: null,
                    isDeleted: false
                }
            });
        }

        sails.log.debug('GetGroupsController found groups:', groups.length);
        if (groups.length > 0) {
            sails.log.debug('First group sample:', JSON.stringify(groups[0], null, 2));
        }

        // Map minimal fields
        const results = groups.map((g: any) => ({
            id: g.id,
            name: g.name,
            slug: g.slug,
            images: g.images,
            icon: g.icon,
            visible: g.visible ?? true // Default to true if undefined/null
        }));

        return res.json({ results });
    } catch (error) {
        sails.log.error('Get groups error', error);
        return res.status(500).json({ error: String(error) });
    }
}
