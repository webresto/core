import type { AddressPoint, GeocodedHouse } from "../../../interfaces/Geo";

/**
 * The outside geocoder of the run: a module's own (DaData for Home Pizza)
 * stands here, attached to the real default geo adapter the way a module
 * attaches it. Only the geocoder is not real.
 *
 * It knows no house unless a test says so: `around` and `house` answer what a
 * test sets, and a reply that throws is a geocoder that is down. `resetDatabase`
 * clears both and the requests.
 */
export const geocoder = {
  around: undefined as undefined | ((point: AddressPoint, radiusMeters: number) => GeocodedHouse[]),
  house: undefined as undefined | ((parts: { city: string; street: string; home: string }) => GeocodedHouse | null),
  /** Every request, for a test that checks what the adapter asked and how often. */
  requests: [] as ({ method: "housesAround"; point: AddressPoint; radiusMeters: number } | { method: "house"; city: string; street: string; home: string })[],
};

/** Once, after the lift: through `adapters/index`, as a module does from its hook. */
export function attachGeocoder(): void {
  const { registerGeocoder } = require("../../../adapters");
  registerGeocoder({
    name: "test",
    priority: 0,
    async housesAround(point: AddressPoint, radiusMeters: number) {
      geocoder.requests.push({ method: "housesAround", point, radiusMeters });
      return geocoder.around?.(point, radiusMeters) ?? [];
    },
    async house(parts: { city: string; street: string; home: string }) {
      geocoder.requests.push({ method: "house", ...parts });
      return geocoder.house?.(parts) ?? null;
    },
  });
}
