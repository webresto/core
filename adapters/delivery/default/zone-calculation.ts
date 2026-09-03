import { WorkTimeValidator } from "@webresto/worktime";
import Address from "../../../interfaces/Address";
import { Delivery } from "../contracts";
import DeliveryAdapter from "../DeliveryAdapter";
import { DeliveryZoneRecord } from "../../../models/DeliveryZone";
import { getServingZones } from "./zone-cache";
import { softDeliveryFallback } from "../../../lib/soft-delivery";
import { findZoneForCoordinate } from "./zone-match";
import { AddressLocation, locateAddress } from "../../../lib/delivery-location";

/**
 * Zone-based delivery, as a default-compatible calculation.
 *
 * An install with no zones must behave exactly as it did before zones existed —
 * no KML, no geocoder, no new setting — so every path that cannot produce a
 * zone match hands the calculation back to the caller's settings-based
 * fallback instead of failing.
 */

/** Legacy-compatible result for an address that no zone covers. */
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
    message: sails.__("Outside the delivery area"),
    diagnostics,
  };
}

function zoneDescription(zone: DeliveryZoneRecord): string {
  if (zone.description) return zone.description;

  const parts: string[] = [];
  if (zone.deliveryCost) parts.push(sails.__("Delivery cost: %s", String(zone.deliveryCost)));
  if (zone.minOrderTotal) parts.push(sails.__("Minimum order price: %s", String(zone.minOrderTotal)));
  if (zone.freeDeliveryFrom) parts.push(sails.__("Free delivery for orders above: %s", String(zone.freeDeliveryFrom)));

  return parts.length ? parts.join("\n") : sails.__("Delivery conditions apply");
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
      message: sails.__("At the moment, the delivery area does not work, try it later"),
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
      message: sails.__("Minimum order amount: %s", String(zone.minOrderTotal)),
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
      message: sails.__("Free delivery"),
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
    message: sails.__(zoneDescription(zone)),
    zoneId: zone.id as string,
    diagnostics,
  };
}

export interface ZoneMatch {
  /** `null` when zones exist but none matched, or when matching was impossible. */
  zone: DeliveryZoneRecord | null;
  /** `false` when the install has no zones at all: keep the previous behaviour. */
  zonesConfigured: boolean;
  location: AddressLocation;
}

/** Resolves the address and finds its zone, without deciding what to charge. */
export async function matchZone(adapter: DeliveryAdapter, address: Address | undefined | null): Promise<ZoneMatch> {
  const zones = await getServingZones();
  if (!zones.length) {
    return {
      zone: null,
      zonesConfigured: false,
      location: { coordinate: null, unrecognized: false, diagnostics: [] },
    };
  }

  const location = await locateAddress(adapter, address);
  if (!location.coordinate) {
    return { zone: null, zonesConfigured: true, location };
  }

  return { zone: findZoneForCoordinate(zones, location.coordinate), zonesConfigured: true, location };
}

/** The result for an address the adapter tried and failed to place on the map. */
export function locationUnrecognized(diagnostics: string[]): Delivery {
  return {
    allowed: false,
    deliveryTimeMinutes: null,
    cost: 0,
    item: undefined,
    hasError: true,
    deliveryLocationUnrecognized: true,
    message: sails.__("Coordinates not found"),
    diagnostics,
  };
}
