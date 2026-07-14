declare const mcp: any;

const ORDER_INVESTIGATION_PROJECTION = [
    'id', 'shortId', 'state', 'orderedAt', 'completedAt', 'createdAt', 'updatedAt',
    'concept', 'isMixedConcept',
    'paid', 'isPaymentPromise', 'paymentMethodTitle',
    'problem',
    'rmsDelivered', 'rmsId', 'rmsOrderNumber', 'rmsDeliveryDate',
    'rmsErrorMessage', 'rmsErrorCode', 'rmsStatusCode', 'rmsOrderStatus',
    'selfService', 'delivery', 'deliveryDescription', 'deliveryCost',
    'totalWeight', 'trifleFrom',
    'bonusesTotal', 'spendBonus',
    'total', 'basketTotal', 'discountTotal',
    'promotionState', 'promotionErrors', 'promotionCodeDescription',
    'promotionCodeString', 'promotionFlatDiscount', 'promotionDelivery',
    'promotionUnorderable', 'isPromoting',
    'customer', 'address', 'comment', 'personsCount', 'date',
    'dishesCount', 'uniqueDishes',
    'orderedOnPlatform', 'deviceId', 'nonce', 'hash', 'tag',
];

async function loadFullOrder(criteria: Record<string, unknown>) {
    const order: any = await Order.findOne(criteria)
        .populate('paymentMethod')
        .populate('user')
        .populate('pickupPoint')
        .populate('deliveryItem')
        .populate('promotionCode');
    if (!order) return null;

    const orderDishes = await OrderDish.find({ order: order.id }).populate('dish').sort('createdAt ASC');
    order.dishes = Array.isArray(orderDishes) ? orderDishes : [];

    try {
        const paymentDocuments = await PaymentDocument.find({
            originModel: 'order',
            originModelId: order.id,
        }).populate('paymentMethod').sort('createdAt ASC');
        order.paymentDocuments = Array.isArray(paymentDocuments) ? paymentDocuments : [];
    } catch (e) {
        order.paymentDocuments = [];
    }

    return order;
}

async function findOrderByIdentifier(id?: string, shortId?: string) {
    const normalizedId = id ? String(id).trim() : '';
    const normalizedShortId = shortId ? String(shortId).trim().toUpperCase() : '';

    if (normalizedId) {
        const byId = await Order.findOne({ id: normalizedId });
        if (byId) return byId;

        const byShortId = await Order.findOne({ shortId: normalizedId.toUpperCase() });
        if (byShortId) return byShortId;
    }

    if (normalizedShortId) {
        return await Order.findOne({ shortId: normalizedShortId });
    }

    return null;
}

export function registerOrderTools() {
    if (process.env.MCP_ENABLED !== 'true' && process.env.MCP_INTERNAL_ENABLED !== 'true') return;

    mcp.registerTool({
        name: 'order-get',
        group: 'order',
        description:
            'Investigation tool. Returns a single order with EVERYTHING needed to debug status and relations: '
            + 'populated paymentMethod/user/pickupPoint/deliveryItem/promotionCode, full OrderDish list (with dish populated), '
            + 'all PaymentDocuments (originModel=order), and allowedTransitions from the current state.\n\n'
            + 'Lookup by id OR shortId (last 8 chars of id, uppercase) OR rmsOrderNumber.',
        mode: 'protected',
        schema: {
            type: 'object',
            properties: {
                id:             { type: 'string', description: 'Order id (uuid).', example: '4b1f...' },
                shortId:        { type: 'string', description: 'Order shortId (8 uppercase chars).', example: 'A1B2C3D4' },
                rmsOrderNumber: { type: 'string', description: 'External RMS order number.', example: '12345' },
            },
        },
        handler: async ({ id, shortId, rmsOrderNumber }: { id?: string; shortId?: string; rmsOrderNumber?: string }) => {
            if (!id && !shortId && !rmsOrderNumber) {
                throw new Error('One of id / shortId / rmsOrderNumber is required');
            }

            if (id || shortId) {
                const order: any = await findOrderByIdentifier(id, shortId);
                return order ? await loadFullOrder({ id: order.id }) : null;
            }

            return await loadFullOrder({ rmsOrderNumber });
        },
    });

    mcp.registerTool({
        name: 'order-list',
        group: 'order',
        description:
            'Investigation tool. Returns a slim list of orders matching filters. '
            + 'Use this to find candidate orders, then call order-get for the full picture. '
            + 'Defaults: limit=20, sort by createdAt DESC. Excludes verbose fields (logs, rmsOrderData, modifiers).',
        mode: 'protected',
        schema: {
            type: 'object',
            properties: {
                state:         { type: 'string',  description: 'Order state (NEW, CART, CHECKOUT, PAYMENT, ORDER, COOKING, ON_THE_WAY, DONE, REJECT).', example: 'ORDER' },
                paid:          { type: 'boolean', description: 'Filter by paid flag.', example: true },
                problem:       { type: 'boolean', description: 'Only orders flagged with a problem.', example: true },
                rmsDelivered:  { type: 'boolean', description: 'Filter by rmsDelivered flag.', example: false },
                user:          { type: 'string',  description: 'User id.', example: 'u-abc' },
                phone:         { type: 'string',  description: 'Customer phone (matches order.customer.phone substring).', example: '+7900' },
                shortId:       { type: 'string',  description: 'Exact shortId.', example: 'A1B2C3D4' },
                createdAfter:  { type: 'string',  description: 'ISO date — only orders with createdAt >= this.', example: '2026-05-01T00:00:00Z' },
                createdBefore: { type: 'string',  description: 'ISO date — only orders with createdAt < this.', example: '2026-05-12T00:00:00Z' },
                limit:         { type: 'number',  description: 'Max rows (default 20, hard cap 200).', example: 20 },
                skip:          { type: 'number',  description: 'Offset.', example: 0 },
            },
        },
        handler: async (params: Record<string, any>) => {
            const where: Record<string, any> = {};
            if (params.state        !== undefined) where.state        = params.state;
            if (params.paid         !== undefined) where.paid         = params.paid;
            if (params.problem      !== undefined) where.problem      = params.problem;
            if (params.rmsDelivered !== undefined) where.rmsDelivered = params.rmsDelivered;
            if (params.user)    where.user    = params.user;
            if (params.shortId) where.shortId = String(params.shortId).toUpperCase();

            if (params.createdAfter || params.createdBefore) {
                where.createdAt = {} as Record<string, any>;
                if (params.createdAfter)  (where.createdAt as any)['>='] = new Date(params.createdAfter).getTime();
                if (params.createdBefore) (where.createdAt as any)['<']  = new Date(params.createdBefore).getTime();
            }

            const limit = Math.min(Math.max(Number(params.limit) || 20, 1), 200);
            const skip  = Math.max(Number(params.skip) || 0, 0);

            let rows: any[] = await (Order.find as any)({ where, limit, skip, sort: 'createdAt DESC', select: ORDER_INVESTIGATION_PROJECTION });

            if (params.phone) {
                const needle = String(params.phone).toLowerCase();
                rows = rows.filter(r => String(r?.customer?.phone || '').toLowerCase().includes(needle));
            }
            return rows;
        },
    });

    mcp.registerTool({
        name: 'order-logs',
        group: 'order',
        description: 'Returns the logs array for an order by id or shortId. Useful for tracing state changes, promotion runs, payment events, RMS sync. Newest entries last.',
        mode: 'protected',
        schema: {
            type: 'object',
            properties: {
                id:      { type: 'string', description: 'Order id or shortId.', example: '4b1f...' },
                shortId: { type: 'string', description: 'Order shortId.', example: 'A1B2C3D4' },
                level:   { type: 'string', description: 'Filter by level: info, warn, error, debug.', example: 'error' },
                limit:   { type: 'number', description: 'Return last N entries (default all).', example: 100 },
            },
        },
        handler: async ({ id, shortId, level, limit }: { id?: string; shortId?: string; level?: string; limit?: number }) => {
            const order: any = await findOrderByIdentifier(id, shortId);
            if (!order) throw new Error('Order not found');
            let logs: any[] = await Order.getLogs({ id: order.id });
            logs = Array.isArray(logs) ? logs : [];
            if (level) logs = logs.filter(l => l?.level === level);
            if (limit && logs.length > limit) logs = logs.slice(-limit);
            return { id: order.id, shortId: order.shortId, state: order.state, count: logs.length, logs };
        },
    });

    mcp.registerTool({
        name: 'order-payment-documents',
        group: 'order',
        description: 'Returns all PaymentDocuments linked to an order by id or shortId (originModel=order, originModelId=<order.id>), with paymentMethod populated. Use to debug payment state.',
        mode: 'protected',
        schema: {
            type: 'object',
            properties: {
                id:      { type: 'string', description: 'Order id or shortId.', example: '4b1f...' },
                shortId: { type: 'string', description: 'Order shortId.', example: 'A1B2C3D4' },
            },
        },
        handler: async ({ id, shortId }: { id?: string; shortId?: string }) => {
            const order: any = await findOrderByIdentifier(id, shortId);
            if (!order) throw new Error('Order not found');
            return await PaymentDocument.find({ originModel: 'order', originModelId: order.id })
                .populate('paymentMethod')
                .sort('createdAt ASC');
        },
    });

}
