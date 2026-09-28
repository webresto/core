import type { AuthProviderPublic, AuthProviderRecord } from "../models/AuthProvider";

const PUBLIC_FIELDS: (keyof AuthProviderPublic)[] = ["adapter", "title", "kind", "iconUrl", "buttonColor", "buttonTextColor", "sortOrder"];

/** The part of a provider row a storefront may see. */
export function toPublic(row: AuthProviderRecord): AuthProviderPublic {
  const out: any = {};
  for (const f of PUBLIC_FIELDS) out[f] = (row as any)[f];
  return out as AuthProviderPublic;
}
