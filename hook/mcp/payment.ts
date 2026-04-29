declare const mcp: any;

export function registerPaymentTools() {
    if (process.env.MCP_ENABLED !== 'true') return;

    mcp.registerTool({
        name: 'payment-method-list',
        description: 'Returns all payment methods with title, type, enable status, sortOrder and isCash flag.',
        mode: 'protected',
        schema: { type: 'object', properties: {} },
        handler: async () => {
            return await PaymentMethod.find().sort('sortOrder ASC');
        },
    });

    mcp.registerTool({
        name: 'payment-method-update',
        description:
            'Updates a payment method. Safe fields only: title, enable, sortOrder, description.\n\n'
            + 'WARNING: adapter and type are NOT editable — they are structural and must not change.',
        mode: 'protected',
        schema: {
            type: 'object',
            properties: {
                id:          { type: 'string',  description: 'PaymentMethod ID.', example: 'abc123' },
                title:       { type: 'string',  description: 'Display name.', example: 'Cash on delivery' },
                description: { type: 'string',  description: 'Description shown to user.', example: 'Pay when courier arrives' },
                enable:      { type: 'boolean', description: 'Enable/disable this method.', example: false },
                sortOrder:   { type: 'number',  description: 'Display order.', example: 1 },
            },
            required: ['id'],
        },
        handler: async ({ id, title, description, enable, sortOrder }: { id: string; title?: string; description?: string; enable?: boolean; sortOrder?: number }) => {
            const data: any = {};
            if (title       !== undefined) data.title       = title;
            if (description !== undefined) data.description = description;
            if (enable      !== undefined) data.enable      = enable;
            if (sortOrder   !== undefined) data.sortOrder   = sortOrder;
            const updated = await PaymentMethod.updateOne({ id }).set(data);
            if (!updated) throw new Error('Payment method not found');
            return updated;
        },
    });
}
