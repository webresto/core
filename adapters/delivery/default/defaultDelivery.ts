import Address from "../../../interfaces/Address";
import { CurrencyISOList } from "../../../interfaces/Country";
import { OrderRecord } from "../../../models/Order";
import DeliveryAdapter from "../DeliveryAdapter";
import {
  Delivery,
  DeliveryCoordinate,
  DeliveryLocationSearchResult,
  ResolvedDeliveryLocation,
} from "../contracts";
import {
  applyZone,
  describeZone,
  locationUnrecognized,
  matchZone,
  outsideDeliveryArea,
} from "./zone-calculation";
import { resolveSelectedLocation } from "../../../lib/delivery-location";
import {
  geocodeAddress,
  searchAddressLocations,
  searchOrganizationLocations,
} from "./geocoder-nominatim";

/**
 * The delivery adapter core falls back to: zones from a KML map, addresses from
 * Nominatim, and the settings-based tariff underneath both.
 *
 * With no zones it computes exactly what it always did, from the same settings.
 * A zone adds its tariff and limits only when the address actually lands inside
 * one, so an install that never creates a zone needs no KML and no new setting
 * to keep working.
 *
 * Everything this adapter needs it owns — there is no registry of parts to
 * assemble. An installation that wants a different geocoder or different zones
 * writes its own adapter against `DeliveryAdapter` and points `DELIVERY_ADAPTER`
 * at it; the zone machinery in this folder stays available to it as plain
 * functions.
 */
export class DefaultDeliveryAdapter extends DeliveryAdapter {
  public async checkAbility(address: Address): Promise<Delivery> {
    const match = await matchZone(this, address);

    if (match.zone) {
      return await describeZone(match.zone, match.location.diagnostics);
    }

    if (match.zonesConfigured) {
      if (match.location.unrecognized) {
        return locationUnrecognized(match.location.diagnostics);
      }
      if (match.location.coordinate) {
        return outsideDeliveryArea(match.location.diagnostics);
      }
    }

    return this.checkAbilityFromSettings(match.location.diagnostics);
  }

  public getCapabilities() {
    return {
      supportsAddressSearch: true,
      supportsOrganizationSearch: true,
    };
  }

  public async searchAddress(query: string, city?: string): Promise<DeliveryLocationSearchResult[]> {
    return searchAddressLocations(query, city);
  }

  public async searchOrganization(query: string, city?: string): Promise<DeliveryLocationSearchResult[]> {
    return searchOrganizationLocations(query, city);
  }

  public async resolveDeliveryLocation(
    selected: DeliveryLocationSearchResult,
    suppliedCoordinate?: DeliveryCoordinate,
  ): Promise<ResolvedDeliveryLocation> {
    return resolveSelectedLocation(selected, {
      suppliedCoordinate,
      geocode: (parts) => geocodeAddress(parts),
    });
  }

  /** The pre-zone behaviour, kept verbatim. */
  private async checkAbilityFromSettings(diagnostics: string[] = []): Promise<Delivery> {
    const minDeliveryTimeInMinutes = await Settings.get("MIN_DELIVERY_TIME_IN_MINUTES");
    const deliveryCost = await Settings.get("DELIVERY_COST");
    const freeDeliveryFrom = await Settings.get("FREE_DELIVERY_FROM");
    const minDeliveryAmount = await Settings.get("MIN_DELIVERY_AMOUNT");
    const currencyISO = await Settings.get("DEFAULT_CURRENCY_ISO") as CurrencyISOList;
    const messageTemplate = await Settings.get("CHECK_DELIVERY_MESSAGE_TEMPLATE");

    let currency = sails.dictionaries.currencies[currencyISO].currencySymbol;

    const messageData = {
        minDeliveryTime: minDeliveryTimeInMinutes,
        deliveryCost: deliveryCost,
        freeDeliveryFrom: freeDeliveryFrom,
        minDeliveryAmount: minDeliveryAmount,
        currency: currency
    };

    let message = messageTemplate;
    for (const [key, value] of Object.entries(messageData)) {
        if (value !== undefined && value !== null) {
            message = message.replace(new RegExp(`{{${key}}}`, 'g'), String(value));
        }
    }

    return {
        deliveryTimeMinutes: minDeliveryTimeInMinutes,
        allowed: true,
        cost: deliveryCost,
        item: null,
        message: message,
        diagnostics: diagnostics.length ? diagnostics : undefined
    };
}


  public async calculate(order: OrderRecord): Promise<Delivery> {
    const match = await matchZone(this, order.address);

    if (match.zone) {
      return await applyZone(match.zone, order.basketTotal ?? 0, match.location.diagnostics);
    }

    if (match.zonesConfigured) {
      if (match.location.unrecognized) {
        return locationUnrecognized(match.location.diagnostics);
      }
      if (match.location.coordinate) {
        return outsideDeliveryArea(match.location.diagnostics);
      }
    }

    return this.calculateFromSettings(order, match.location.diagnostics);
  }

  /** The pre-zone behaviour, kept verbatim. */
  private async calculateFromSettings(order: OrderRecord, diagnostics: string[] = []): Promise<Delivery> {
    const deliveryCost = await Settings.get("DELIVERY_COST");
    const deliveryItem = await Settings.get("DELIVERY_ITEM");
    const deliveryMessage = await Settings.get("DELIVERY_MESSAGE");
    const freeDeliveryFrom = await Settings.get("FREE_DELIVERY_FROM");
    const minDeliveryAmount = await Settings.get("MIN_DELIVERY_AMOUNT");
    const minDeliveryTimeInMinutes = await Settings.get("MIN_DELIVERY_TIME_IN_MINUTES");

    if(order.basketTotal < (minDeliveryAmount || 0)) {
      return  {
        allowed:false,
        deliveryTimeMinutes: minDeliveryTimeInMinutes ?? 60,
        cost: 0,
        item: undefined,
        message: `Minimum amount not allowed`,
        diagnostics: diagnostics.length ? diagnostics : undefined
      }
    }

    if (order.basketTotal > ( freeDeliveryFrom ?? Infinity )) {
      return  {
        allowed: true,
        deliveryTimeMinutes: minDeliveryTimeInMinutes ?? 60,
        cost: 0,
        item: undefined,
        message: '',
        diagnostics: diagnostics.length ? diagnostics : undefined
      }
    } else {
      return  {
        allowed: true,
        deliveryTimeMinutes: minDeliveryTimeInMinutes ?? 60,
        cost: deliveryCost ? deliveryCost : 0,
        item: deliveryItem ?? undefined,
        message: deliveryMessage ?? '',
        diagnostics: diagnostics.length ? diagnostics : undefined
      }
    }
  }
}
