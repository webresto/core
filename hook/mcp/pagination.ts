/**
 * Shared pagination guard for MCP list tools.
 *
 * Tool params come from an LLM, so `limit` is untrusted: without a hard cap a
 * single call can pull an entire table into the heap (and then get serialized
 * twice — once for the HTTP response, once for the agent transcript).
 */

export const DEFAULT_LIST_LIMIT = 50;
export const MAX_LIST_LIMIT = 200;

export function boundedPage(
    limit: unknown,
    skip: unknown,
    { defaultLimit = DEFAULT_LIST_LIMIT, maxLimit = MAX_LIST_LIMIT }: { defaultLimit?: number; maxLimit?: number } = {},
): { limit: number; skip: number } {
    const rawLimit = Number(limit);
    const rawSkip = Number(skip);
    return {
        limit: Number.isFinite(rawLimit) && rawLimit > 0 ? Math.min(Math.floor(rawLimit), maxLimit) : defaultLimit,
        skip: Number.isFinite(rawSkip) && rawSkip > 0 ? Math.floor(rawSkip) : 0,
    };
}
