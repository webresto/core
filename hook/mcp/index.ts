import { registerSettingsTools } from './settings';
import { registerPlacesTools } from './places';
import { registerMaintenanceTools } from './maintenance';
import { registerPaymentTools } from './payment';
import { registerDishesTools } from './dishes';
import { registerGroupsTools } from './groups';
import { registerMediaTools } from './media';
import { registerBackupTools } from './backup';
import { registerOrderTools } from './order';
import { registerNotificationTools } from './notifications';
import { registerPromotionsTools } from './promotions';
import { registerSalesChannelsTools } from './sales-channels';
import { registerDeliveryTools } from './delivery';
import { registerCitiesTools } from './cities';
import { registerStockTools } from './stock';
import { registerAddressTools, registerDeliveryZoneTools } from '../../adapters';

declare const mcp: any;

/**
 * Tool groups exposed by the core hook. Registering them here gives each group
 * a human-readable description in the GET /mcp catalogue; the tool files below
 * attach their tools to these groups via the `group` field.
 */
const CORE_GROUPS: Array<{ name: string; description: string }> = [
    { name: 'settings',       description: 'Read and update global application settings and configuration.' },
    { name: 'places',         description: 'Manage delivery places / spots: list, inspect and edit locations.' },
    { name: 'maintenance',    description: 'Maintenance mode and service operations: toggle availability, run housekeeping.' },
    { name: 'payment',        description: 'Payment methods and payment documents: configure methods, confirm a pending payment by hand.' },
    { name: 'dishes',         description: 'Manage menu dishes: list, get, create and update dishes.' },
    { name: 'groups',         description: 'Manage menu groups / categories: list, get, create and update categories.' },
    { name: 'media',          description: 'Manage media and images: list, upload, attach and remove media.' },
    { name: 'backup',         description: 'Backup and restore operations for application data.' },
    { name: 'order',          description: 'Inspect and manage orders: list, get, and change order state.' },
    { name: 'notifications',  description: 'Manage push/admin notifications: list, send, configure channels.' },
    { name: 'promotions',     description: 'Manage promotions and discounts: list, get, create and update.' },
    { name: 'sales-channels', description: 'Manage sales channels: list, get, create and update channels.' },
    { name: 'delivery-zones', description: 'Delivery zones and their terms: list, update one or many, run the map synchronisation, check delivery to an address.' },
    { name: 'cities',         description: 'Cities the places, zones and address catalogs belong to: list, create, update.' },
    { name: 'addresses',      description: 'Address catalog of a city: load a file by URL in the background, statistics, search as the storefront does.' },
    { name: 'stock',          description: 'Stock of dishes per place: list what limits a kitchen, set a balance, a stop or a switch.' },
];

export function registerCoreMcpTools() {
    if (process.env.MCP_ENABLED !== 'true' && process.env.MCP_INTERNAL_ENABLED !== 'true') return;

    for (const group of CORE_GROUPS) {
        mcp.registerGroup(group);
    }

    registerSettingsTools();
    registerPlacesTools();
    registerMaintenanceTools();
    registerPaymentTools();
    registerDishesTools();
    registerGroupsTools();
    registerMediaTools();
    registerBackupTools();
    registerOrderTools();
    registerNotificationTools();
    registerPromotionsTools();
    registerSalesChannelsTools();
    registerDeliveryTools();
    registerCitiesTools();
    registerStockTools();
    // The zones and the address catalog are the default adapters' models, so their tools live there.
    registerDeliveryZoneTools();
    registerAddressTools();
}
