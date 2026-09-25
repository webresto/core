import OrderAddress from "../../interfaces/OrderAddress";
import { OrderRecord } from "../../models/Order";
import { Delivery, DeliveryCoordinate, PlaceCandidate, TravelEstimate } from "../../interfaces/Delivery";
import { distanceKm } from "../../lib/geo/utils";

/** What a courier averages in town, kerb to kerb, when nothing says otherwise. */
export const DEFAULT_CITY_SPEED_KMH = 20;

/**
 * How an order gets a delivery price and a yes-or-no answer.
 *
 * One adapter serves an installation, chosen by `DELIVERY_ADAPTER`, and it owns
 * what delivery decides: what an address is charged and how long the road takes.
 * How an address becomes a coordinate is the geo adapter's question.
 *
 * `calculate` and `checkAbility` are abstract: core cannot go on without them.
 * The rest carry an answer core can live with, and an implementation overrides
 * them when it knows better.
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
   * Which of the candidate kitchens serves this coordinate, for the
   * `delivery-zone` strategy of `KITCHEN_RESOLVE_CHAIN`.
   *
   * `null` is an absence, never a failure: the chain moves on to its next
   * strategy. An adapter whose tariff is drawn on a map knows which kitchen a
   * point belongs to and overrides this; one that does not, answers nothing.
   */
  public async resolvePlaceForCoordinate(
    _coordinate: DeliveryCoordinate | null,
    _candidates: PlaceCandidate[],
    _diagnostics: string[] = [],
  ): Promise<string | null> {
    return null;
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
  }

  public abstract checkAbility(address: OrderAddress): Promise<Delivery>;

}
