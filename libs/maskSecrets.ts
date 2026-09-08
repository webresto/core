/**
 * Masking of secret setting values.
 *
 * A setting flagged `secret` holds a token/password/key: it must not leave the DB
 * in clear text — not in an MCP tool response, not in an admin readout and not in
 * a log line (container logs are collected into acceptance-run artifacts).
 * Everything that renders a setting value for a human or a model goes through here.
 */

/**
 * Field names that carry a credential whatever the surrounding object is.
 * Needed because a setting may be perfectly ordinary while its json payload
 * still holds an issued key (OPENHARNESS_BROKER_STATE → `apiKey`).
 */
export const SENSITIVE_FIELDS = new Set([
    'private_key', 'private_key_id', 'password', 'secret', 'api_key', 'apiKey',
    'token', 'access_token', 'refresh_token', 'client_secret',
]);

/** Stand-in for a credential-looking field inside an otherwise printable value. */
export const FIELD_MASK = '***';

/**
 * A setting flagged `secret` lives in the DB only and is never disclosed, not even
 * to an operator-driven model. It stays settable (settings-set writes it), so only
 * the readout is replaced by this marker.
 */
export const SECRET_PLACEHOLDER = '[secret — stored, never disclosed]';

/**
 * Key names that mean "credential" on their own. Used where the stored `secret`
 * flag is not available or not trustworthy — a module manifest may simply omit
 * `secret`, and a log line must never be the weakest link.
 *
 * The credential word must end the key: JWT_SECRET and OPENAI_API_KEY hold a
 * credential, while PASSWORD_MIN_LENGTH, PASSWORD_POLICY and CORE_PASSWORD_REQUIRED
 * only describe the policy around one and stay readable in logs.
 */
const SECRET_KEY_PATTERN = /(?:^|_)(?:SECRET|PASSWORD|PASSWD|TOKEN|API_?KEY|PRIVATE_?KEY|CREDENTIALS?)$/i;

/** Depth cap: settings values are arbitrary json and may be self-referential. */
const MAX_DEPTH = 8;

export function isSecretSettingKey(key: unknown): boolean {
    return typeof key === 'string' && SECRET_KEY_PATTERN.test(key);
}

/**
 * Replaces credential-looking fields at any depth. Non-objects pass through
 * unchanged: the caller decides whether the value as a whole may be shown.
 */
export function maskSensitiveValue(value: any, depth: number = 0): any {
    if (value === null || value === undefined) return value;
    if (typeof value !== 'object') return value;
    if (value instanceof Date) return value;
    if (depth >= MAX_DEPTH) return value;
    if (Array.isArray(value)) return value.map((item) => maskSensitiveValue(item, depth + 1));

    const masked: Record<string, any> = {};
    for (const [k, v] of Object.entries(value)) {
        masked[k] = SENSITIVE_FIELDS.has(k) ? FIELD_MASK : maskSensitiveValue(v, depth + 1);
    }
    return masked;
}

/**
 * Value as it may be shown for a given setting: the whole thing is hidden when the
 * setting is secret, otherwise only credential-looking fields inside it are.
 * `undefined` is kept as is so callers can drop the key from the output entirely.
 */
export function maskSettingValue(setting: { secret?: boolean } | null | undefined, value: any): any {
    if (setting?.secret) {
        if (value === undefined) return undefined;
        return value === null ? null : SECRET_PLACEHOLDER;
    }
    return maskSensitiveValue(value);
}

/**
 * Same as `maskSettingValue`, but for log lines, where the stored flag may be
 * missing: a secret-looking key masks even without it.
 */
export function maskSettingValueForLog(setting: { key?: unknown; secret?: boolean } | null | undefined, value: any): any {
    if (setting?.secret) return maskSettingValue({ secret: true }, value);
    // The key name is only a guess, so trust it only where the value could be a
    // credential at all: a boolean or a number named ..._PASSWORD is a policy switch
    // (CORE_SET_LAST_OTP_AS_PASSWORD, PASSWORD_MIN_LENGTH), not a password, and
    // hiding it would cost diagnostics for nothing.
    const couldBeCredential = typeof value === 'string' || (value !== null && typeof value === 'object');
    if (couldBeCredential && isSecretSettingKey(setting?.key)) return maskSettingValue({ secret: true }, value);
    return maskSensitiveValue(value);
}
