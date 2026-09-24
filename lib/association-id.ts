/** An association can arrive populated or as a bare id; either way, its id. */
export function toId(value: unknown): string | null {
  if (typeof value === "string") return value.trim() || null;
  if (value && typeof value === "object" && typeof (value as { id?: unknown }).id === "string") {
    return (value as { id: string }).id.trim() || null;
  }
  return null;
}
