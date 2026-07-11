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
    { name: 'payment',        description: 'Payment methods and configuration.' },
    { name: 'dishes',         description: 'Manage menu dishes: list, get, create and update dishes.' },
    { name: 'groups',         description: 'Manage menu groups / categories: list, get, create and update categories.' },
    { name: 'media',          description: 'Manage media and images: list, upload, attach and remove media.' },
    { name: 'backup',         description: 'Backup and restore operations for application data.' },
    { name: 'order',          description: 'Inspect and manage orders: list, get, and change order state.' },
    { name: 'notifications',  description: 'Manage push/admin notifications: list, send, configure channels.' },
    { name: 'promotions',     description: 'Manage promotions and discounts: list, get, create and update.' },
    { name: 'sales-channels', description: 'Manage sales channels: list, get, create and update channels.' },
];

export function registerCoreMcpTools() {
    if (process.env.MCP_ENABLED !== 'true') return;

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
}
