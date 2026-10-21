import { AddressPoint } from "../../../interfaces/Geo";
import { ADDRESS_TYPES } from "./defaultGeo";
import { relinkCache } from "./address-cache";

/**
 * Loading an address catalog from a file.
 *
 * The catalog is a graph, and a file is a list — so the nodes name each other by
 * a `key` that exists only inside the file. Nothing of it reaches the database:
 * once a node is created its children are attached by the id it got, and the key
 * is forgotten. That is what lets a file list a house before its street.
 *
 * By default a load only adds: nothing is matched against what the city has, so
 * the same file loaded twice stops at the first node that already exists. With
 * `replace` the catalog of the city is emptied right before the file is written,
 * so the same file loaded twice gives the same catalog. That includes the streets
 * an RMS brought (they come back with its next sync), but not what geocoders
 * found: the cached houses stay and hang under the file's streets
 * (`relinkCache`), unless the file has the house itself. The file is checked in full
 * before anything is deleted, but there is no transaction: a database that fails
 * halfway leaves the city with part of the file, and loading the file again with
 * `replace` repairs it.
 */

/** One line of the file. `key` is only ever the target of another node's `parent`. */
export interface AddressImportNode {
  key?: string;
  parent?: string;
  type: string;
  name: string;
  names?: string[];
  point?: AddressPoint | null;
  /** Only a `range` carries these; the model refuses them on anything else. */
  lo?: number | null;
  hi?: number | null;
}

export interface AddressImportResult {
  created: number;
  /** Nodes of the city deleted before the file was written; 0 unless `replace`. */
  deleted: number;
  /** Non-empty means nothing was written at all. */
  errors: string[];
}

/**
 * Everything wrong with the file, before a single row is created.
 *
 * All of it, not the first one: an operator fixing an export wants the list.
 * `types` is `ADDRESS_TYPES`; a parameter so the rule reads without the catalog.
 */
export function validateAddressNodes(nodes: unknown, types: readonly string[]): string[] {
  if (!Array.isArray(nodes)) return ['File has no "nodes" list'];
  if (!nodes.length) return ["File lists no nodes"];

  const errors: string[] = [];
  const keys = new Set<string>();

  for (const [index, node] of (nodes as AddressImportNode[]).entries()) {
    const where = node?.name ? `"${node.name}"` : `#${index + 1}`;

    if (typeof node?.name !== "string" || !node.name.trim()) errors.push(`Node ${where} has no name`);

    if (!types.includes(node?.type)) {
      errors.push(`Node ${where} has an unknown type "${node?.type}"`);
    }

    if (node?.key !== undefined) {
      if (keys.has(node.key)) errors.push(`Key "${node.key}" is used by more than one node`);
      keys.add(node.key);
    }
  }

  for (const [index, node] of (nodes as AddressImportNode[]).entries()) {
    const where = node?.name ? `"${node.name}"` : `#${index + 1}`;
    if (node?.parent && !keys.has(node.parent)) {
      errors.push(`Node ${where} names a parent "${node.parent}" the file does not define`);
    }
  }

  return errors;
}

/**
 * Orders the file so a node always comes after the node it hangs from.
 *
 * Returns `null` when what is left cannot be ordered — a node that is its own
 * ancestor. The file is written by hand often enough for that to happen, and it
 * would otherwise be an endless loop rather than a message.
 */
function byDepth(nodes: AddressImportNode[]): AddressImportNode[] | null {
  const ordered: AddressImportNode[] = [];
  const placed = new Set<string>();
  let pending = nodes;

  while (pending.length) {
    const ready = pending.filter((node) => !node.parent || placed.has(node.parent));
    if (!ready.length) return null;

    for (const node of ready) {
      ordered.push(node);
      if (node.key !== undefined) placed.add(node.key);
    }
    pending = pending.filter((node) => !ready.includes(node));
  }

  return ordered;
}

/** Loads the catalog of one city, emptying it first when `replace`. Nothing is deleted or written if the file has an error. */
export async function importAddresses(params: {
  city: string;
  nodes: AddressImportNode[];
  /** Delete every address of the city before the file is written. Off unless asked. */
  replace?: boolean;
}): Promise<AddressImportResult> {
  const errors = validateAddressNodes(params.nodes, ADDRESS_TYPES);
  if (errors.length) return { created: 0, deleted: 0, errors };

  const ordered = byDepth(params.nodes);
  if (!ordered) return { created: 0, deleted: 0, errors: ["Some nodes reference each other in a circle"] };

  // Ours only: what geocoders found is not in the file and was paid for.
  const deleted: unknown[] = params.replace ? await Address.destroy!({ city: params.city, cache: null }).fetch() : [];

  const ids = new Map<string, string>();
  let created = 0;

  for (const node of ordered) {
    const row = await Address.create!({
      city: params.city,
      parent: node.parent ? ids.get(node.parent) : null,
      type: node.type,
      name: node.name.trim(),
      names: Array.isArray(node.names) ? node.names : [],
      point: node.point ?? null,
      lo: node.lo ?? null,
      hi: node.hi ?? null,
    }).fetch();

    if (node.key !== undefined) ids.set(node.key, row.id);
    created++;
  }

  await relinkCache(params.city);
  return { created, deleted: deleted.length, errors: [] };
}
