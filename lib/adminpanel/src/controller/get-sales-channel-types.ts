import { getSalesChannelPermissions, hasAccess } from "./sales-channels-helpers";
import { SalesChannelRegistry, SalesChannelTypeDefinition } from "../../../SalesChannelRegistry";
import { getInstalledProviderAppIds } from "../../../SalesChannelProviders";
import { describeChannelType } from "../../../sales-channels/view";

/** A type definition as the admin UI sees it: the one view of a type, `lib/sales-channels/view.ts`. */
export function mapChannelType(def: SalesChannelTypeDefinition, installed: Set<string> | null, canManage: boolean) {
  return describeChannelType(def, { installed, canManage });
}

/**
 * GET …/core/sales-channels/types
 * Channel-type catalog from SalesChannelRegistry with provider state (see mapChannelType).
 */
export default async function GetSalesChannelTypesController(req: any, res: any) {
  try {
    if (!hasAccess(req, res)) return;
    const permissions = getSalesChannelPermissions(req);
    const canManage = permissions.canManage;

    const installed = await getInstalledProviderAppIds();
    const types = SalesChannelRegistry.listTypes().map((def) => mapChannelType(def, installed, canManage));

    return res.json({ results: types, meta: { permissions, canManage } });
  } catch (error) {
    sails.log.error("Get sales channel types error", error);
    return res.status(500).json({ error: String(error) });
  }
}
