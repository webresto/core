import { Geocoder } from "../../../interfaces/Geo";

/**
 * The geocoders modules attach to the default geo adapter, the smaller `priority` first.
 *
 * State of the default implementation, not a registry next to `Adapter`: another geo adapter keeps
 * its own catalog and geocodes its own way, and these are not asked. Attached through
 * `adapters/index.ts`, the way a module registers a notification channel or a way to sign in.
 */
const attached: Geocoder[] = [];

/** A second geocoder of one name is a second module claiming it: refused, not swapped in. */
export function registerGeocoder(geocoder: Geocoder): void {
  if (!geocoder.name) throw new Error("A geocoder needs a name");
  if (attached.some((one) => one.name === geocoder.name)) throw new Error(`A geocoder "${geocoder.name}" is attached already`);
  attached.push(geocoder);
  attached.sort((a, b) => a.priority - b.priority);
  sails.log.info(`CORE > geocoder "${geocoder.name}" attached to the default geo adapter`);
}

export function attachedGeocoders(): readonly Geocoder[] {
  return attached;
}

/**
 * How long a question every geocoder answered with nothing is not asked again: the same field
 * clicked twice, the same house that does not exist typed twice, is not paid for twice. A geocoder
 * that failed has said nothing yet, so a failure is not remembered.
 */
const MISS_TTL_MS = 10 * 60 * 1000;
const misses = new Map<string, number>();

export function isRecentMiss(key: string): boolean {
  const until = misses.get(key);
  if (until === undefined) return false;
  if (until > Date.now()) return true;
  misses.delete(key);
  return false;
}

export function rememberMiss(key: string): void {
  const now = Date.now();
  for (const [known, until] of misses) if (until <= now) misses.delete(known);
  misses.set(key, now + MISS_TTL_MS);
}
