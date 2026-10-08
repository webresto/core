import { findOrderByIdentifier } from './order';

declare const mcp: any;

/** Who called the tool: an admin session, the MCP admin key or an in-process caller */
function mcpCaller(ctx: any): string {
    const user = ctx?.req?.user;
    if (user) return `admin:${user.login ?? user.id}`;
    return ctx?.req ? 'mcp-key' : 'mcp-internal';
}

/** The only pending payment of an order; several or none is an error for the caller to resolve */
async function findPendingOrderPayment(orderIdentifier: string): Promise<string> {
    const order: any = await findOrderByIdentifier(orderIdentifier);
    if (!order) throw new Error('Order not found');

    const documents = await PaymentDocument.find({ originModel: 'order', originModelId: order.id }).sort('createdAt ASC');
    const pending = documents.filter((document) => document.status === 'REGISTERED' && !document.paid && !document.supersededAt);
    if (pending.length === 1) return pending[0].id;

    const summary = documents.map((document) => `${document.id}: ${document.status}${document.paid ? ', paid' : ''}${document.supersededAt ? ', superseded' : ''}`);
    if (!pending.length) {
        throw new Error(`Order ${order.shortId} (${order.state}) has no pending payment. Payment documents: ${summary.join('; ') || 'none'}`);
    }
    throw new Error(`Order ${order.shortId} has ${pending.length} pending payments, pass paymentDocumentId: ${summary.join('; ')}`);
}

export function registerPaymentTools() {
    if (process.env.MCP_ENABLED !== 'true' && process.env.MCP_INTERNAL_ENABLED !== 'true') return;

    mcp.registerTool({
        name: 'payment-method-list',
        group: 'payment',
        description: 'Returns all payment methods with title, type, enable status, sortOrder and isCash flag.',
        mode: 'protected',
        schema: { type: 'object', properties: {} },
        handler: async () => {
            return await PaymentMethod.find().sort('sortOrder ASC');
        },
    });

    mcp.registerTool({
        name: 'payment-method-update',
        group: 'payment',
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

    mcp.registerTool({
        name: 'payment-document-confirm',
        group: 'payment',
        description:
            'Confirms a pending payment by hand, as if the payment gateway had reported it paid. '
            + 'The gateway is NOT asked and the money is NOT checked: use it for test orders on a live gateway '
            + 'or when the money is confirmed outside the gateway.\n\n'
            + 'After confirmation the regular paid flow runs: the order is marked paid, placed and sent to the RMS '
            + '(the kitchen gets it as a paid order). Only a REGISTERED, unpaid, not superseded document can be confirmed. '
            + 'Who, how and why is stored in paymentDocument.data.manualConfirmation and in the order log; '
            + 'the order comment (sent to the RMS) gets "Payment confirmed manually: <reason>" in the default locale.\n\n'
            + 'Pass paymentDocumentId, or orderId when the order has exactly one pending payment '
            + '(see order-payment-documents). Returns the document, the order after the paid flow and its last log entries.',
        mode: 'protected',
        schema: {
            type: 'object',
            properties: {
                paymentDocumentId: { type: 'string', description: 'PaymentDocument id.', example: '9F1C0A7E3B5D4E2F8A6B1C0D9E8F7A6B' },
                orderId:           { type: 'string', description: 'Order id or shortId; used when paymentDocumentId is not given.', example: 'A1B2C3D4' },
                reason:            { type: 'string', description: 'Why the payment is confirmed by hand.', example: 'test order, no money' },
            },
            required: ['reason'],
        },
        handler: async (
            { paymentDocumentId, orderId, reason }: { paymentDocumentId?: string; orderId?: string; reason: string },
            ctx: any,
        ) => {
            if (!paymentDocumentId && !orderId) throw new Error('paymentDocumentId or orderId is required');
            const documentId = paymentDocumentId ? String(paymentDocumentId).trim() : await findPendingOrderPayment(String(orderId));

            let confirmed: any;
            try {
                confirmed = await PaymentDocument.confirm({ id: documentId }, { by: mcpCaller(ctx), via: 'mcp', reason });
            } catch (e) {
                // the model throws strings; the MCP server reports only Error.message
                throw e instanceof Error ? e : new Error(String(e));
            }

            const paymentDocument = await PaymentDocument.findOne({ id: confirmed.id }).populate('paymentMethod');
            if (paymentDocument.originModel !== 'order') return { paymentDocument };

            const order: any = await Order.findOne({ id: paymentDocument.originModelId });
            const logs: any[] = await Order.getLogs({ id: order.id });
            return {
                paymentDocument,
                order: {
                    id: order.id,
                    shortId: order.shortId,
                    state: order.state,
                    paid: order.paid,
                    problem: order.problem,
                    rmsDelivered: order.rmsDelivered,
                    rmsErrorMessage: order.rmsErrorMessage,
                },
                logs: Array.isArray(logs) ? logs.slice(-10) : [],
            };
        },
    });
}
