import { WorkTimeValidator } from "@webresto/worktime";
import OrderAddress from "../../../interfaces/OrderAddress";
import { Delivery, NO_DELIVERY_ZONES_DIAGNOSTIC } from "../contracts";
import { Adapter } from "../../index";
import { DeliveryZoneRecord } from "../../../models/DeliveryZone";
import { getServingZones } from "./zone-cache";
import { softDeliveryFallback } from "../soft-delivery";
import { findZoneForCoordinate } from "./zone-match";
import { AddressLocation, locateAddress } from "../../geo/delivery-location";

/**
 * Zone-based delivery: the zone is the tariff, and there is no other.
 *
 * Every path that cannot produce a zone match ends in a refusal of the same
 * shape as a priced answer — `unmatchedZone` below says which one.
 */

/** The result for an address that no zone covers. */
export async function outsideDeliveryArea(diagnostics: string[] = []): Promise<Delivery> {
  const cost = await Settings.get("OUTSIDE_DELIVERY_AREA_DEFAULT_COST");
  const item = await Settings.get("OUTSIDE_DELIVERY_AREA_DEFAULT_ITEM");

  if (!cost && !item) {
    // No stand-in tariff, so there is nothing to charge — but under soft
    // calculation checkout takes the order regardless, so refusing here would
    // tell the customer the opposite of what the system is about to do. Falls
    // through to the refusal below only when soft calculation is off.
    const soft = await softDeliveryFallback(diagnostics);
    if (soft) return soft;
  }

  // Drawing zones is usually how an install limits where it delivers, so an
  // address outside all of them is refused unless these settings say otherwise.
  return {
    allowed: !!cost || !!item,
    deliveryTimeMinutes: null,
    cost: item ? 0 : cost || 0,
    item: cost ? undefined : item || undefined,
    message: "Outside the delivery area",
    diagnostics,
  };
}

/**
 * The zone's terms in words, for a zone whose operator wrote none.
 *
 * Keys and their numbers travel apart: the numbers are not translatable and the
 * sentences are. One key per line, the arguments in the order the lines take
 * them.
 */
function zoneDescription(zone: DeliveryZoneRecord): { message: string; messageArgs?: string[] } {
  // The operator's own text is not a key and is never translated.
  if (zone.description) return { message: zone.description };

  const lines: string[] = [];
  const messageArgs: string[] = [];
  if (zone.deliveryCost) {
    lines.push("Delivery cost: %s");
    messageArgs.push(String(zone.deliveryCost));
  }
  if (zone.minOrderTotal) {
    lines.push("Minimum order price: %s");
    messageArgs.push(String(zone.minOrderTotal));
  }
  if (zone.freeDeliveryFrom) {
    lines.push("Free delivery for orders above: %s");
    messageArgs.push(String(zone.freeDeliveryFrom));
  }

  if (!lines.length) return { message: "Delivery conditions apply" };
  return { message: lines.join("\n"), messageArgs };
}

/** Whether the zone accepts orders right now. */
export function zoneIsOpen(zone: DeliveryZoneRecord): boolean {
  if (zone.enable === false) return false;
  if (!zone.worktime || !zone.worktime.length) return true;

  return WorkTimeValidator.isWorkNow({ worktime: zone.worktime } as any).workNow !== false;
}

/**
 * The zone's terms for an order of this size.
 *
 * `basketTotal` is the order total before delivery, matching what the legacy
 * module compared against.
 */
export async function applyZone(
  zone: DeliveryZoneRecord,
  basketTotal: number,
  diagnostics: string[] = [],
): Promise<Delivery> {
  const zoneId = zone.id as string;

  if (!zoneIsOpen(zone)) {
    return {
      allowed: false,
      deliveryTimeMinutes: zone.minDeliveryTime ?? null,
      cost: 0,
      item: undefined,
      message: "At the moment, the delivery area does not work, try it later",
      zoneId,
      diagnostics,
    };
  }

  if (basketTotal <= (zone.minOrderTotal ?? 0)) {
    return {
      allowed: false,
      deliveryTimeMinutes: zone.minDeliveryTime ?? null,
      cost: 0,
      item: undefined,
      message: "Minimum order amount: %s",
      messageArgs: [String(zone.minOrderTotal)],
      zoneId,
      diagnostics,
    };
  }

  // `0` and an unset value both mean "no free delivery", not "free from zero".
  const freeDeliveryFrom = zone.freeDeliveryFrom && zone.freeDeliveryFrom > 0 ? zone.freeDeliveryFrom : Infinity;
  if (basketTotal >= freeDeliveryFrom) {
    return {
      allowed: true,
      deliveryTimeMinutes: zone.minDeliveryTime ?? null,
      cost: 0,
      item: undefined,
      message: "Free delivery",
      zoneId,
      diagnostics,
    };
  }

  // A delivery product and a delivery cost are alternatives: the product
  // carries its own price and is added to the order as a line.
  if (zone.deliveryItem) {
    return {
      allowed: true,
      deliveryTimeMinutes: zone.minDeliveryTime ?? null,
      cost: undefined,
      item: zone.deliveryItem as string,
      message: zone.deliveryMessage ?? "",
      zoneId,
      diagnostics,
    };
  }

  return {
    allowed: true,
    deliveryTimeMinutes: zone.minDeliveryTime ?? null,
    cost: zone.deliveryCost ?? 0,
    item: undefined,
    message: zone.deliveryMessage ?? "",
    zoneId,
    diagnostics,
  };
}

/** What `checkAbility` reports for a zone, before any basket exists. */
export async function describeZone(zone: DeliveryZoneRecord, diagnostics: string[] = []): Promise<Delivery> {
  return {
    allowed: true,
    deliveryTimeMinutes: zone.minDeliveryTime ?? null,
    cost: zone.deliveryCost ?? 0,
    item: zone.deliveryItem ? (zone.deliveryItem as string) : undefined,
    ...zoneDescription(zone),
    zoneId: zone.id as string,
    diagnostics,
  };
}

export interface ZoneMatch {
  /** `null` when zones exist but none matched, or when matching was impossible. */
  zone: DeliveryZoneRecord | null;
  /** `false` when the install has no zones at all, so there is nothing to price with. */
  zonesConfigured: boolean;
  location: AddressLocation;
}

/**
 * The answer when no zone matched, for whichever of the three reasons.
 *
 * No zones at all comes first: the address is not the problem then, and
 * blaming it would send the customer to retype something that was fine. With
 * zones, a coordinate that fell outside them all is outside the area, and no
 * coordinate at all — the geocoder failed, or the address is too incomplete to
 * try — is an address the map could not place.
 */
export async function unmatchedZone(match: ZoneMatch): Promise<Delivery> {
  if (!match.zonesConfigured) return noDeliveryZones(match.location.diagnostics);
  if (match.location.coordinate) return await outsideDeliveryArea(match.location.diagnostics);
  return await locationUnrecognized(match.location.diagnostics);
}

/**
 * The result for an installation that has not drawn a single zone.
 *
 * Zones are the only tariff, so there is nothing to price with. The setup
 * checklist (`has_delivery_zone`) tells the operator; the customer is told the
 * way an address outside every zone is.
 */
export function noDeliveryZones(diagnostics: string[] = []): Delivery {
  return {
    allowed: false,
    deliveryTimeMinutes: null,
    cost: 0,
    item: undefined,
    message: "Delivery is not available",
    diagnostics: [...diagnostics, NO_DELIVERY_ZONES_DIAGNOSTIC],
  };
}

/**
 * Resolves the address and finds its zone, without deciding what to charge.
 *
 * The address is placed the way `kitchen-assignment` places it: `locateAddress`
 * with the installation's geo adapter.
 */
export async function matchZone(address: OrderAddress | undefined | null): Promise<ZoneMatch> {
  const zones = await getServingZones();
  if (!zones.length) {
    return {
      zone: null,
      zonesConfigured: false,
      location: { coordinate: null, unrecognized: false, diagnostics: [] },
    };
  }

  const location = await locateAddress(await Adapter.getGeoAdapter(), address);
  if (!location.coordinate) {
    return { zone: null, zonesConfigured: true, location };
  }

  const zone = findZoneForCoordinate(zones, location.coordinate);
  location.diagnostics.push(zone ? `zone ${zone.id} matched` : `coordinate is in none of ${zones.length} zone(s)`);
  return { zone, zonesConfigured: true, location };
}

/**
 * The result for an address the adapter tried and failed to place on the map.
 *
 * The same answer as an address outside every zone, and for the same reason:
 * checkout under soft calculation takes the order whatever the map said, so the
 * address form must not refuse what the next screen accepts. `hasError` is not
 * set — the calculation did not break, it simply has no coordinate to price.
 * Why it has none is in `diagnostics`.
 */
export async function locationUnrecognized(diagnostics: string[]): Promise<Delivery> {
  const soft = await softDeliveryFallback(diagnostics);
  if (soft) return soft;

  return {
    allowed: false,
    deliveryTimeMinutes: null,
    cost: 0,
    item: undefined,
    message: "Coordinates not found",
    diagnostics,
  };
}
