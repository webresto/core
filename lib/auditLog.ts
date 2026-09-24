type AuditPrimitive = string | number | boolean | null;
type AuditValue = AuditPrimitive | AuditPrimitive[] | Record<string, unknown> | undefined;

const DEFAULT_IGNORED_FIELDS = new Set([
  "updatedAt",
  "createdAt",
  "hash",
]);

function stableStringify(value: unknown): string {
  if (value === undefined) return "undefined";
  if (value === null) return "null";
  if (typeof value !== "object") return JSON.stringify(value);

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(",")}]`;
  }

  const entries = Object.entries(value as Record<string, unknown>)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, nested]) => `${JSON.stringify(key)}:${stableStringify(nested)}`);
  return `{${entries.join(",")}}`;
}

export function getAuditActor(req: any) {
  const user = req?.user || null;
  const forwardedFor = req?.headers?.["x-forwarded-for"];
  const ip = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : typeof forwardedFor === "string"
      ? forwardedFor.split(",")[0]?.trim()
      : req?.ip || req?.socket?.remoteAddress || null;

  return {
    id: user?.id ?? null,
    login: user?.login ?? null,
    phone: user?.phone ?? null,
    name: [user?.firstName, user?.lastName].filter(Boolean).join(" ") || null,
    ip,
    userAgent: req?.headers?.["user-agent"] ?? null,
  };
}

export function buildAuditDiff(
  before: Record<string, any> | null | undefined,
  after: Record<string, any> | null | undefined,
  options?: { ignoredFields?: string[] }
) {
  const ignoredFields = new Set([
    ...DEFAULT_IGNORED_FIELDS,
    ...(options?.ignoredFields || []),
  ]);

  const keys = new Set<string>([
    ...Object.keys(before || {}),
    ...Object.keys(after || {}),
  ]);

  const changes = Object.fromEntries(
    Array.from(keys)
      .filter((key) => !ignoredFields.has(key))
      .filter((key) => stableStringify(before?.[key]) !== stableStringify(after?.[key]))
      .map((key) => [
        key,
        {
          before: (before?.[key] ?? null) as AuditValue,
          after: (after?.[key] ?? null) as AuditValue,
        },
      ])
  );

  return {
    changes,
    changedFields: Object.keys(changes),
  };
}

export function logAuditEvent(
  scope: string,
  action: string,
  payload: Record<string, unknown>
) {
  sails.log.info(`[AUDIT] ${scope} ${action}`, payload);
}
