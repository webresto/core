"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuditActor = getAuditActor;
exports.buildAuditDiff = buildAuditDiff;
exports.logAuditEvent = logAuditEvent;
const DEFAULT_IGNORED_FIELDS = new Set([
    "updatedAt",
    "createdAt",
    "hash",
]);
function stableStringify(value) {
    if (value === undefined)
        return "undefined";
    if (value === null)
        return "null";
    if (typeof value !== "object")
        return JSON.stringify(value);
    if (Array.isArray(value)) {
        return `[${value.map((item) => stableStringify(item)).join(",")}]`;
    }
    const entries = Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, nested]) => `${JSON.stringify(key)}:${stableStringify(nested)}`);
    return `{${entries.join(",")}}`;
}
function getAuditActor(req) {
    const user = (req === null || req === void 0 ? void 0 : req.user) || null;
    const forwardedFor = req === null || req === void 0 ? void 0 : req.headers["x-forwarded-for"];
    const ip = Array.isArray(forwardedFor)
        ? forwardedFor[0]
        : typeof forwardedFor === "string"
            ? forwardedFor.split(",")[0] === null || forwardedFor.split(",")[0] === void 0 ? void 0 : forwardedFor.split(",")[0].trim()
            : (req === null || req === void 0 ? void 0 : req.ip) || (req === null || req === void 0 ? void 0 : req.socket.remoteAddress) || null;
    return {
        id: user === null || user === void 0 ? void 0 : user.id,
        login: (user === null || user === void 0 ? void 0 : user.login) || null,
        phone: (user === null || user === void 0 ? void 0 : user.phone) || null,
        name: [(user === null || user === void 0 ? void 0 : user.firstName), (user === null || user === void 0 ? void 0 : user.lastName)].filter(Boolean).join(" ") || null,
        ip,
        userAgent: ((req === null || req === void 0 ? void 0 : req.headers["user-agent"]) || null),
    };
}
function buildAuditDiff(before, after, options) {
    const ignoredFields = new Set([
        ...DEFAULT_IGNORED_FIELDS,
        ...((options === null || options === void 0 ? void 0 : options.ignoredFields) || []),
    ]);
    const keys = new Set([
        ...Object.keys(before || {}),
        ...Object.keys(after || {}),
    ]);
    const changes = Object.fromEntries(Array.from(keys)
        .filter((key) => !ignoredFields.has(key))
        .filter((key) => stableStringify(before === null || before === void 0 ? void 0 : before[key]) !== stableStringify(after === null || after === void 0 ? void 0 : after[key]))
        .map((key) => [
        key,
        {
            before: ((before === null || before === void 0 ? void 0 : before[key]) !== null && (before === null || before === void 0 ? void 0 : before[key]) !== void 0 ? before === null || before === void 0 ? void 0 : before[key] : null),
            after: ((after === null || after === void 0 ? void 0 : after[key]) !== null && (after === null || after === void 0 ? void 0 : after[key]) !== void 0 ? after === null || after === void 0 ? void 0 : after[key] : null),
        },
    ]));
    return {
        changes,
        changedFields: Object.keys(changes),
    };
}
function logAuditEvent(scope, action, payload) {
    sails.log.info(`[AUDIT] ${scope} ${action}`, payload);
}
