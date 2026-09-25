import { AddressPoint } from "../../../interfaces/Geo";
import { ADDRESS_TYPES } from "./defaultGeo";

/**
 * Loading an address catalog from a file.
 *
 * The catalog is a graph, and a file is a list — so the nodes name each other by
 * a `key` that exists only inside the file. Nothing of it reaches the database:
 * once a node is created its children are attached by the id it got, and the key
 * is forgotten. That is what lets a file list a house before its street.
 *
 * Like the zone upload, this is not a synchronisation. There is no matching
 * against what is already there and no `externalId`: the same file loaded twice
 * makes the streets twice, and the operator deletes the set they did not mean.
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

/** Creates the catalog of one city. Nothing is written if the file has an error. */
export async function importAddresses(params: {
  city: string;
  nodes: AddressImportNode[];
}): Promise<AddressImportResult> {
  const errors = validateAddressNodes(params.nodes, ADDRESS_TYPES);
  if (errors.length) return { created: 0, errors };

  const ordered = byDepth(params.nodes);
  if (!ordered) return { created: 0, errors: ["Some nodes reference each other in a circle"] };

  const ids = new Map<string, string>();
  let created = 0;

  for (const node of ordered) {
    const row = await Address.create({
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

  return { created, errors: [] };
}
