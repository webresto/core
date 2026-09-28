import type { AddressRecord } from "../../models/Address";

/** The node's name or one of its aliases contains `needle`, which is already lower-case. */
export function nameMatches(node: AddressRecord, needle: string): boolean {
  if (node.name?.toLowerCase().includes(needle)) return true;
  return (node.names ?? []).some((alias) => typeof alias === "string" && alias.toLowerCase().includes(needle));
}
