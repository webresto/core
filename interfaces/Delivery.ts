/**
 * What delivery exchanges with the rest of the application.
 *
 * Nothing here imports anything but a shape: contracts describe shapes, they do
 * not reach for models, settings or adapters.
 */

/**
 * **Soft delivery calculation**
 * This is done so that some deliveries can agree on the cost of delivery themselves.
 * If it is `allowed = true` and the `cost = null`,
 * then this is only possible if the required delivery calculation flag is absent
 */
export interface Delivery {
  /**
   * The delivery leg alone, in minutes. A zone answers with its
   * `minDeliveryTime`, the floor the whole promise is built on, so the zone's
   * time is not repeated among its terms below.
   *
   * `null` when no promise can be made — an address outside every zone, or one
   * that could not be placed on the map. GraphQL has always exposed this field
   * as a nullable `Int`; the declaration here just caught up.
   */
  deliveryTimeMinutes: number | null
  allowed: boolean
  /** `undefined` when `item` carries the price instead. */
  cost: number | null | undefined
  item: string | undefined
  /**
   * What the customer is told, in English, as a translation key.
   *
   * Core does not translate it: `sails.__` knows the installation's default
   * locale, not the locale of the person who is reading, and the two are the
   * same only by accident. GraphQL translates the field on the way out, where
   * the request says which language to use — so the dictionary for these lines
   * lives in `@webresto/graphql/translations`, not in core.
   *
   * Text an operator typed (a zone's `deliveryMessage`, a message setting) goes
   * through untouched: it is already in the language its author chose.
   */
  message: string,
  /** `sprintf` arguments for `message`, one per `%s`, lines counted in order. */
  messageArgs?: string[],
  /**
   * A flag that shows that it was not possible to recognize how to make a delivery
   * street and house number not found.
   */
  deliveryLocationUnrecognized?: boolean
  /**
   * This flag indicates that there was an error not related to business logic. Any error like new Error
   */
  hasError?: boolean
  /** The zone whose terms produced this result, when one matched. */
  zoneId?: string
  /**
   * That zone’s name, for the operator screens and the storefront. A label taken
   * when the price was, so neither reads the adapter’s zones itself.
   */
  zoneName?: string
  /**
   * That zone’s terms as numbers, for a storefront that shows them next to the
   * address. `message` carries the same in words; these do not replace it.
   * `null` when the zone sets none (unset or `0` both mean "no minimum" and
   * "no free delivery"), absent when no zone matched.
   */
  minOrderTotal?: number | null
  freeDeliveryFrom?: number | null
  /**
   * What the zone charges for delivery, whatever it decided about this basket.
   * `cost` is what this basket pays — `0` when it is refused or delivered free,
   * absent when a product carries the price; this is the tariff quoted next to
   * the address. A zone that charges a product quotes the product's price. `0`
   * is a free delivery, not an unset one.
   */
  deliveryCost?: number
  /**
   * The kitchens that take this address are closed now: when the first opens and takes it, the order date by the
   * restaurant's clock (`YYYY-MM-DD HH:mm`). `null` — a kitchen takes it now. Asked about an address alone
   * (`deliveryForAddress`), with soft calculation off; absent otherwise.
   */
  kitchenOpensAt?: string | null
  /** What the operator wrote about the zone, untranslated. `null` — nothing. */
  zoneDescription?: string | null
  /**
   * The adapter has nothing to price any address with — the installation is not
   * set up, the address is not at fault. `Order.check` refuses such an order even
   * under `SOFT_DELIVERY_CALCULATION`: soft calculation is for an address whose
   * price cannot be worked out, not for an installation that cannot price anything.
   */
  notConfigured?: boolean
  /**
   * The promised time.
   *
   * Additive and optional: an adapter that only prices
   * delivery has nothing to say about how long cooking takes, and every adapter
   * written before these existed keeps compiling. `deliveryTimeMinutes` above is
   * untouched and still means the delivery leg alone — this is the whole
   * promise, cooking included, which is a different number and must not quietly
   * replace it.
   */
  preparationMinutes?: number
  totalTimeMinutes?: number
  /** Straight-line kilometres from the kitchen, when both coordinates were known. */
  distanceKm?: number
  /** `haversine`, a provider's name, or `none`. */
  travelTimeSource?: string
  /** Why the calculation ended up where it did; for operators, never customers. */
  diagnostics?: string[]
}

/** `{ lat, lon }`, matching `Place.coordinate`. Polygons are stored `[lon, lat]`. */
export type DeliveryCoordinate = {
  lat: number;
  lon: number;
}

/** A kitchen as the zone picker sees it: an id and where it stands. */
export interface PlaceCandidate {
  id: string;
  coordinate: DeliveryCoordinate | null;
}

/** How long the road from the kitchen to the customer takes, and how it was worked out. */
export interface TravelEstimate {
  distanceKm: number;
  travelMinutes: number;
  /** `haversine` is the built-in straight-line estimate; anything else is an adapter's own. */
  source: string;
}

/** One zone as an external source describes it. Never a database row. */
export interface ImportedDeliveryZone {
  /** Stable identifier in the source. Required: without it nothing can be matched. */
  externalId: string;
  name: string;
  description?: string;
  /** Ring of `[lon, lat]` pairs. */
  polygon: number[][];
  sourceHash?: string;
  sourceUpdatedAt?: string;
  /**
   * The layer this zone sits in, when the source has layers at all.
   *
   * A KML folder is a layer; a file with no folders yields zones with no layer.
   * Groups are never guessed from names — the first map named differently would
   * break the guess, and a wrong grouping silently reprices zones.
   *
   * `externalId` must not collide with a zone's: the two share one identity
   * space inside a source and a city. A source that invents layer ids namespaces
   * them, which is why this is the source's business and not core's.
   */
  layer?: { externalId: string; name: string };
}

export interface DeliveryZoneSnapshot {
  /** Name of the source, e.g. `kml`. Identifies the rows this snapshot owns. */
  source: string;
  /**
   * The city these zones belong to, when the installation has more than one.
   *
   * A snapshot owns the zones of one source *in one city* and no others. Leaving
   * this out on a multi-city installation would make each city's sync mark every
   * other city's zones as missing from the source.
   */
  city?: string | null;
  fetchedAt: string;
  zones: ImportedDeliveryZone[];
  /**
   * Whether descriptions in the source may overwrite local ones. Off by default
   * because operators routinely write delivery terms into that field.
   */
  updateDescriptions?: boolean;
}
