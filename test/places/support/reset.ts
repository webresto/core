import { nominatim } from "./nominatim";

/**
 * A clean installation for the next test file: no rows, settings as they were
 * right after boot, no promotion handlers, a Nominatim that knows nothing.
 *
 * Called from a file's top-level `before`, so the file builds its own data and
 * nothing leaks from the file that ran before it.
 */

/**
 * Rows core seeds at boot; kept, since a fresh installation has them too.
 * `authmethod` is the auth registry: its own `core/sms` row is written when the
 * adapter registers itself on boot, and nothing writes it again.
 */
const SEEDED = new Set(["settings", "notificationrules", "authmethod"]);

/**
 * Settings as they read right after boot, by key. The value `Settings.get`
 * answers, not the row's: a row left at `null` reads as its manifest's default,
 * and writing `null` back would not — a boolean would become `false`.
 */
let settingsAtBoot = new Map<string, string>();

const read = async (key: string) => JSON.stringify(await Settings.get(key as any));

export async function snapshotSettings(): Promise<void> {
  settingsAtBoot = new Map();
  for (const row of await Settings.find({})) settingsAtBoot.set(row.key, await read(row.key));
}

export async function resetDatabase(): Promise<void> {
  for (const [name, model] of Object.entries<any>(sails.models)) {
    if (SEEDED.has(name)) continue;
    // `fetch` so every row's `afterDestroy` runs and drops what it caches.
    await model.destroy({}).fetch();
  }

  for (const [key, value] of settingsAtBoot) {
    if (value !== undefined && value !== (await read(key))) await Settings.set(key as any, { value: JSON.parse(value) });
  }

  // Handlers live in the adapter's memory, not in the table: a promotion one
  // file set up would otherwise discount the next file's baskets.
  Adapter.getPromotionAdapter().deleteAllPromotions();

  nominatim.reply = undefined;
  nominatim.requests = [];
}

/** Runs `run` with `values` set, and puts back what they were, whatever `run` does. */
export async function withSettings<T>(values: Record<string, unknown>, run: () => Promise<T>): Promise<T> {
  const before = new Map<string, unknown>();
  for (const [key, value] of Object.entries(values)) {
    before.set(key, await Settings.get(key as any));
    await Settings.set(key as any, { value } as any);
  }
  try {
    return await run();
  } finally {
    for (const [key, value] of before) await Settings.set(key as any, { value } as any);
  }
}
