/**
 * The live record of a slug, for dish-get and group-get: `found` - the records of the slug that are not deleted. A
 * slug is the name made a word and is not unique (UNIQUE_SLUG off): a deleted dish keeps the slug of a live one of the
 * same name (`margarita` of HP), two live ones of a name share it too. None - null; two live - an error naming them,
 * each is asked by its id.
 */
export function liveBySlug<T extends { id?: string; name?: string; parentGroup?: unknown }>(found: T[], slug: string, what: string): T | null {
    if (found.length <= 1) return found[0] ?? null;
    const named = found.map((item) => `${item.id} «${item.name ?? ''}»${item.parentGroup ? ` in group ${groupId(item.parentGroup)}` : ''}`);
    throw new Error(`${found.length} live ${what} share the slug "${slug}": ${named.join(', ')}. Ask by id.`);
}

const groupId = (group: unknown): string => (typeof group === 'object' && group !== null ? String((group as { id?: unknown }).id) : String(group));
