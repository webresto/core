import { getSalesChannelPermissions, hasAccess } from "./sales-channels-helpers";
import { SalesChannelRegistry, SalesChannelTypeDefinition } from "../../../SalesChannelRegistry";
import { channelTypeTag, getInstalledProviderAppIds, isProviderInstalled, isTypeAvailable } from "../../../SalesChannelProviders";

/**
 * A type definition as the admin UI sees it: `installed` (provider module present, not
 * removed or disabled), `alive` (its adapter is registered, so channels can be created),
 * `available` (not "Coming soon") and the marketplace tag to search providers by.
 */
export function mapChannelType(def: SalesChannelTypeDefinition, installed: Set<string> | null, canManage: boolean) {
  const providerInstalled = isProviderInstalled(def.providerModule, installed);
  return {
    ...def,
    settingsUrl: canManage ? def.settingsUrl : null,
    providerModule: canManage ? def.providerModule : null,
    // Unknown (no Module model) counts as installed so a minimal install is not downgraded.
    installed: providerInstalled !== false,
    alive: Boolean(SalesChannel.getAdapter(def.type)),
    available: isTypeAvailable(def),
    marketplaceTag: channelTypeTag(def.type),
  };
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
