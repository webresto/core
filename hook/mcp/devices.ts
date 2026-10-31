import { DialogBox } from '../../lib/DialogBox';
import { DialogBoxConfig } from '../../interfaces/DialogBox';

declare const mcp: any;

/** How long `device-dialog` waits for an answer when the window has no timeout of its own, seconds. */
const DIALOG_WAIT_SECONDS = 60;

/**
 * What the core says and asks of one device (the X-Device-Id of a storefront), on demand: a message - the
 * storefront shows it as a toast (the subscription `message`); a DialogBox - a question by the subscription
 * `action`, answered by the mutation `dialogBoxAnswerProcess`. For the checks of a storefront: in the core
 * only the cancel of an online payment asks a DialogBox.
 */
export function registerDeviceTools() {
    if (process.env.MCP_ENABLED !== 'true' && process.env.MCP_INTERNAL_ENABLED !== 'true') return;

    mcp.registerTool({
        name: 'device-message',
        group: 'devices',
        description:
            'Sends a message to a device by the subscription `message`: the storefront shows it as a toast. '
            + 'Returns the message as sent.',
        mode: 'protected',
        schema: {
            type: 'object',
            properties: {
                deviceId: { type: 'string', description: 'X-Device-Id of the storefront (restocore-deviceId of its localStorage).' },
                type: { type: 'string', enum: ['info', 'error', 'success', 'warn'], description: 'info by default.' },
                title: { type: 'string', example: 'Заказ принят' },
                message: { type: 'string', example: 'Ждём вас через 20 минут' },
            },
            required: ['deviceId', 'title'],
        },
        handler: async ({ deviceId, type = 'info', title, message }: { deviceId: string; type?: string; title: string; message?: string }) => {
            const sent = { deviceId, type, title, message };
            await emitter.emit('send-message', sent);
            return sent;
        },
    });

    mcp.registerTool({
        name: 'device-dialog',
        group: 'devices',
        description:
            'Asks a DialogBox on a device (DialogBox.ask): the storefront gets the action `dialog-box` and answers with '
            + 'dialogBoxAnswerProcess. Waits for the answer as long as the window lives - `timeout` seconds, '
            + `${DIALOG_WAIT_SECONDS} without it - and returns it: answerId - the option chosen, defaultOptionId when `
            + 'the time is out, null without a default; ms - how long it took. Without options - two buttons, yes and no.',
        mode: 'protected',
        schema: {
            type: 'object',
            properties: {
                deviceId: { type: 'string', description: 'X-Device-Id of the storefront (restocore-deviceId of its localStorage).' },
                title: { type: 'string', example: 'Проверка окна' },
                message: { type: 'string', example: 'Окно DialogBox витрины' },
                optionsType: { type: 'string', enum: ['button', 'product'], description: 'button by default.' },
                options: { type: 'array', description: 'The answers: [{ id, button: { label, type: primary|secondary|link|abort } }] or [{ id, product }].' },
                defaultOptionId: { type: 'string', description: 'The answer when the time is out.' },
                timeout: { type: 'number', description: 'Seconds the window lives: the storefront counts down to the default answer, the tool waits as long.' },
                allowClosing: { type: 'boolean', description: 'The customer may close the window without an answer; true by default.' },
                type: { type: 'string', enum: ['routine', 'critical'] },
            },
            required: ['deviceId'],
        },
        handler: async ({ deviceId, ...config }: { deviceId: string } & Partial<DialogBoxConfig>) => {
            const dialog = {
                title: 'Проверка окна',
                message: 'Окно DialogBox витрины',
                optionsType: 'button',
                options: [
                    { id: 'yes', button: { label: 'Понятно', type: 'primary' } },
                    { id: 'no', button: { label: 'Отмена', type: 'abort' } },
                ],
                ...config,
            } as DialogBoxConfig;
            const started = Date.now();
            const answerId = await DialogBox.ask(dialog, deviceId, (dialog.timeout || DIALOG_WAIT_SECONDS) * 1000);
            return { answerId, ms: Date.now() - started };
        },
    });
}
