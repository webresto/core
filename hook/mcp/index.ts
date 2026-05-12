import { registerSettingsTools } from './settings';
import { registerPlacesTools } from './places';
import { registerMaintenanceTools } from './maintenance';
import { registerPaymentTools } from './payment';
import { registerDishesTools } from './dishes';
import { registerGroupsTools } from './groups';
import { registerMediaTools } from './media';
import { registerBackupTools } from './backup';
import { registerOrderTools } from './order';

export function registerCoreMcpTools() {
    if (process.env.MCP_ENABLED !== 'true') return;

    registerSettingsTools();
    registerPlacesTools();
    registerMaintenanceTools();
    registerPaymentTools();
    registerDishesTools();
    registerGroupsTools();
    registerMediaTools();
    registerBackupTools();
    registerOrderTools();
}
