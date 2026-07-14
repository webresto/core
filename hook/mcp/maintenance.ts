declare const mcp: any;

export function registerMaintenanceTools() {
    if (process.env.MCP_ENABLED !== 'true' && process.env.MCP_INTERNAL_ENABLED !== 'true') return;

    mcp.registerTool({
        name: 'maintenance-status',
        group: 'maintenance',
        description: 'Returns whether the site is currently in maintenance mode. Fast check — call before other operations if you suspect downtime.',
        mode: 'protected',
        schema: { type: 'object', properties: {} },
        handler: async () => {
            const isOff = await Maintenance.siteIsOff();
            const active = await Maintenance.getActiveMaintenance();
            return {
                isOff,
                activeMaintenance: active ?? null,
            };
        },
    });

    mcp.registerTool({
        name: 'maintenance-list',
        group: 'maintenance',
        description: 'Returns all maintenance windows including inactive ones.',
        mode: 'protected',
        schema: { type: 'object', properties: {} },
        handler: async () => {
            return await Maintenance.find();
        },
    });

    mcp.registerTool({
        name: 'maintenance-create',
        group: 'maintenance',
        description:
            'Creates a maintenance window that closes the site to orders.\n\n'
            + 'Two scheduling modes:\n'
            + '  One-time:  set startDate + stopDate (ISO strings)\n'
            + '  Recurring: set worktime (WorkTime format — array of day/time rules)\n\n'
            + 'Set enable:true to activate immediately.',
        mode: 'protected',
        schema: {
            type: 'object',
            properties: {
                title:       { type: 'string',  description: 'Name, e.g. "System update".', example: 'System update' },
                description: { type: 'string',  description: 'Message shown to users. May contain HTML.', example: '<p>Site is under maintenance. Back soon.</p>' },
                enable:      { type: 'boolean', description: 'Activate immediately.', example: true },
                startDate:   { type: 'string',  description: 'ISO start datetime for one-time window.', example: '2026-06-01T02:00:00Z' },
                stopDate:    { type: 'string',  description: 'ISO end datetime for one-time window.', example: '2026-06-01T04:00:00Z' },
                worktime:    { type: 'object',  description: 'Recurring schedule (WorkTime format).', example: {} },
            },
            required: ['title'],
        },
        handler: async (params: Record<string, unknown>) => {
            return await Maintenance.create(params).fetch();
        },
    });

    mcp.registerTool({
        name: 'maintenance-update',
        group: 'maintenance',
        description: 'Updates a maintenance window. To close immediately: { id, enable: false }.',
        mode: 'protected',
        schema: {
            type: 'object',
            properties: {
                id:          { type: 'string',  description: 'Maintenance ID.', example: 'abc123' },
                title:       { type: 'string',  description: 'New title.', example: 'Updated maintenance' },
                description: { type: 'string',  description: 'New message.', example: '<p>Updated message</p>' },
                enable:      { type: 'boolean', description: 'Enable/disable.', example: false },
                startDate:   { type: 'string',  description: 'New start.', example: '2026-06-01T02:00:00Z' },
                stopDate:    { type: 'string',  description: 'New end.', example: '2026-06-01T06:00:00Z' },
                worktime:    { type: 'object',  description: 'New schedule.', example: {} },
            },
            required: ['id'],
        },
        handler: async ({ id, ...rest }: Record<string, unknown>) => {
            const updated = await Maintenance.updateOne({ id: id as string }).set(rest);
            if (!updated) throw new Error('Maintenance window not found');
            return updated;
        },
    });

    mcp.registerTool({
        name: 'maintenance-delete',
        group: 'maintenance',
        description: 'Permanently deletes a maintenance window. To temporarily stop it use maintenance-update with { enable: false } instead.',
        mode: 'protected',
        schema: {
            type: 'object',
            properties: {
                id: { type: 'string', description: 'Maintenance ID.', example: 'abc123' },
            },
            required: ['id'],
        },
        handler: async ({ id }: { id: string }) => {
            const deleted = await Maintenance.destroyOne({ id } as any);
            if (!deleted) throw new Error('Maintenance window not found');
            return { success: true, id };
        },
    });
}
