// todo: fix types model instance to {%ModelName%}Record for Order"

import Address from "../../interfaces/Address"
import { OrderRecord } from "../../models/Order"

import {
  Delivery,
  DeliveryAdapterCapabilities,
  DeliveryCapabilityError,
  DeliveryCoordinate,
  DeliveryLocationSearchResult,
  ResolvedDeliveryLocation,
  TravelEstimate,
} from "./contracts";
import { distanceKm } from "./geo";
import { getServingZones } from "./default/zone-cache";
import { findZoneForCoordinate, nearestPlaceInZone, PlaceCandidate } from "./default/zone-match";

/** What a courier averages in town, kerb to kerb, when nothing says otherwise. */
export const DEFAULT_CITY_SPEED_KMH = 20;


/**
 * How an order gets a delivery price and a yes-or-no answer.
 *
 * One adapter serves an installation, chosen by `DELIVERY_ADAPTER`, and it owns
 * everything delivery needs: where zone geometry comes from, how an address
 * becomes a coordinate, how long the road takes. There is no registry of parts
 * to assemble and no second adapter to share the job with.
 *
 * An adapter that wants the built-in zone handling does not inherit it — it
 * calls the same plain functions `DefaultDeliveryAdapter` calls
 * (`matchZone`, `applyZone`, `describeZone`), which take the adapter as an
 * argument precisely so any implementation can reuse them.
 *
 * Capability methods are plain methods with a default implementation, never
 * `abstract`: an adapter written before they existed keeps compiling and keeps
 * working, exactly as `supportsPlaceBalances` did for `RMSAdapter`.
 */
export default abstract class DeliveryAdapter {

  /**
   * How long the road takes, straight line times a city factor.
   *
   * The factor stands in for the fact that streets are not straight and that a
   * courier stops at lights: a plain haversine time would promise a delivery no
   * courier can make.
   *
   * A method rather than a registered provider, because it is the same question
   * as the price and belongs to whoever answers that. An adapter with a routing
   * API overrides this — and owns the caching that comes with a network call,
   * which arithmetic does not need.
   *
   * `null` when a coordinate is missing: that is an absence, not a failure, and
   * the caller quotes what it always quoted.
   */
  public async estimateTravel(
    from: DeliveryCoordinate | null,
    to: DeliveryCoordinate | null,
    diagnostics: string[] = [],
  ): Promise<TravelEstimate | null> {
    if (!from || !to) {
      diagnostics.push("travel time not estimated: kitchen or customer coordinate is missing");
      return null;
    }

    const km = distanceKm(from, to);
    const configured = Number(await Settings.get("DELIVERY_CITY_SPEED_KMH"));
    // A zero or unset speed would divide by zero and promise eternity.
    const speed = Number.isFinite(configured) && configured > 0 ? configured : DEFAULT_CITY_SPEED_KMH;

    return {
      distanceKm: km,
      travelMinutes: Math.ceil((km / speed) * 60),
      source: "haversine",
    };
  }

  /**
   * Which of the candidate kitchens serves this coordinate, by delivery zone.
   *
   * A zone is bound to a kitchen by geometry, not by a stored link: the kitchen
   * whose coordinate lies inside the zone's polygon serves it. Zones come from
   * the same cached list `matchZone` reads, so the zone that names the kitchen
   * and the zone that prices the delivery are always the same one.
   *
   * The assumption, and its limit: a zone contains its kitchen. A satellite
   * zone drawn far from any kitchen binds to nobody here and falls through to
   * the next strategy in the chain. An installation for which that is wrong
   * overrides this method — that is what the capability is for.
   *
   * `null` is an absence, never a failure: no coordinate, no zone, no kitchen
   * inside it.
   */
  public async resolvePlaceForCoordinate(
    coordinate: DeliveryCoordinate | null,
    candidates: PlaceCandidate[],
    diagnostics: string[] = [],
  ): Promise<string | null> {
    if (!coordinate || !candidates.length) return null;

    const zone = findZoneForCoordinate(await getServingZones(), coordinate);
    if (!zone) {
      diagnostics.push("coordinate is in no zone");
      return null;
    }

    const placeId = nearestPlaceInZone(zone, coordinate, candidates);
    if (!placeId) {
      diagnostics.push(`zone ${zone.id} contains no open kitchen`);
      return null;
    }

    diagnostics.push(`${placeId} via zone ${zone.id}`);
    return placeId;
  }

  /**
   * Calc delivery
   * @returns Delivery
   */
  public abstract calculate(order: OrderRecord): Promise<Delivery>;

  /**
   * Reset order
   * @returns void
   */
  public async reset(order: OrderRecord): Promise<void> {
    order.delivery = {
      deliveryTimeMinutes: 0,
      allowed: false,
      cost: null,
      item: undefined,
      message: 'Shipping cost will be calculated'
    }
    order.deliveryCost = 0;
    order.deliveryItem = null;
    order.deliveryDescription = '';
  }

  public abstract checkAbility(address: Address): Promise<Delivery>;

  /**
   * What this adapter can do beyond calculating a price. Core checks it before
   * calling any capability method, so an unset capability is never a runtime
   * surprise.
   */
  public getCapabilities(): DeliveryAdapterCapabilities {
    return {};
  }

  /**
   * Streets and house numbers only. An organization sharing the address must
   * not appear here.
   *
   * `city` narrows the search to the city the customer is ordering in. It is a
   * parameter rather than a setting because the install serves several cities.
   */
  public async searchAddress(query: string, city?: string): Promise<DeliveryLocationSearchResult[]> {
    return [];
  }

  /** Organizations and landmarks only. Never streets. */
  public async searchOrganization(query: string, city?: string): Promise<DeliveryLocationSearchResult[]> {
    return [];
  }

  /**
   * Turns a chosen suggestion into a coordinate.
   *
   * The rule is strict and lives in `lib/delivery-location.ts` so every adapter
   * resolves the same way: client coordinate, then the organization's own
   * coordinate, then geocoding of street + house number, then
   * `DELIVERY_LOCATION_UNRESOLVABLE`. The name of an organization is never sent
   * to a geocoder.
   */
  public async resolveDeliveryLocation(
    selected: DeliveryLocationSearchResult,
    suppliedCoordinate?: DeliveryCoordinate,
  ): Promise<ResolvedDeliveryLocation> {
    // Not `DeliveryLocationError`: an adapter without a geocoder differs from
    // an address that cannot be resolved. The first leaves an install without
    // zone matching, which is a valid configuration; the second blocks one
    // delivery and must be shown to the customer.
    throw new DeliveryCapabilityError("resolveDeliveryLocation");
  }

}
