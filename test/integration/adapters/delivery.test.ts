/// <reference path="./../../../index.ts" />
import { expect } from "chai";
import { address, customer, toPickup } from "../../mocks/customer";
import { invalidateDeliveryZoneCache } from "../../../adapters/delivery/default/zone-cache";

/**
 * The default adapter prices delivery by zones and by nothing else.
 *
 * One order goes through checkout against one zone while the zone's terms
 * change under it: cost, product, message, free delivery, minimum. Then the
 * zone is switched off and the installation has none — no delivery.
 */
describe("Delivery adapter", function () {
  this.timeout(60000);

  // A square around the customer, stored the way KML stores rings: [lon, lat].
  const square = [
    [-74, 40.7],
    [-73.8, 40.7],
    [-73.8, 40.9],
    [-74, 40.9],
    [-74, 40.7],
  ];
  // The coordinate rides on the address, so no geocoder is asked.
  const inside = { ...address, coordinate: { lat: 40.82, lon: -73.92 } };

  const zoneId = "test-delivery-zone";
  const orderId = "test-delivery-adapter";
  let previousTz: any;

  /** The zone's terms, changed the way the zones page changes them. */
  const setZone = async (values: Record<string, unknown>) => {
    await DeliveryZone.updateOne({ id: zoneId }, { ...values, id: zoneId });
  };

  /** Checkout as the customer would, and the order as it came out of it. */
  const check = async (serviceType: "delivery" | "pickup") => {
    await Order.check({ id: orderId }, customer, serviceType, serviceType === "delivery" ? inside : undefined);
    return (await Order.findOne({ id: orderId })) as any;
  };

  before(async function () {
    // Checkout refuses every order while the timezone is unset.
    previousTz = await Settings.get("TZ");
    await Settings.set("TZ", { key: "TZ", value: "Etc/GMT" });

    await DeliveryZone.create({
      id: zoneId,
      name: "Test delivery zone",
      polygon: square,
      minDeliveryTime: 40,
      deliveryCost: 2.75,
    }).fetch();
  });

  after(async function () {
    await DeliveryZone.destroy({ id: zoneId });
    invalidateDeliveryZoneCache();
    await Settings.set("TZ", { key: "TZ", value: previousTz ?? "" });
  });

  it("prices an order by the zone its address lands in, and refuses one when there is no zone", async () => {
    // Enabled only: a disabled product is refused by `addDish`, and the RMS mock
    // sync leaves what it imports disabled.
    const dishes = await Dish.find({ enable: true });

    await Order.create({ id: orderId }).fetch();
    await Order.addDish({ id: orderId }, dishes[0], 1, [], "", "user");

    // The zone's cost, time and identity
    let order = await check("delivery");
    expect(order.delivery).to.include({ allowed: true, zoneId, deliveryTimeMinutes: 40 });
    expect(order.deliveryCost).to.equal(2.75);
    expect(order.deliveryItem).to.equal(null);

    // Pickup has no delivery at all
    await toPickup(orderId);
    order = await check("pickup");
    expect(order.delivery).to.equal(null);
    expect(order.deliveryDescription).to.equal("");
    expect(order.deliveryCost).to.equal(0);
    expect(order.deliveryItem).to.equal(null);

    // A delivery product instead of the cost
    const deliveryItem = dishes[2];
    await setZone({ deliveryItem: deliveryItem.id });
    order = await check("delivery");
    expect(order.delivery.allowed).to.equal(true);
    expect(order.deliveryCost).to.equal(deliveryItem.price);
    expect(order.deliveryItem).to.equal(deliveryItem.id);

    // The zone's message reaches the order
    const deliveryMessage = "Test123 123 %%%";
    await setZone({ deliveryItem: null, deliveryMessage });
    order = await check("delivery");
    expect(order.delivery.allowed).to.equal(true);
    expect(order.deliveryDescription).to.equal(deliveryMessage);

    // Free from a threshold
    const freeDeliveryFrom = 333;
    await setZone({ freeDeliveryFrom });
    await Order.addDish({ id: orderId }, dishes[3], Math.ceil(freeDeliveryFrom / dishes[3].price), [], "", "user");
    order = await check("delivery");
    expect(order.delivery.allowed).to.equal(true);
    expect(order.deliveryDescription).to.equal("Free delivery");
    expect(order.deliveryCost).to.equal(0);
    expect(order.deliveryItem).to.equal(null);

    // Below the zone's minimum. Refused on the delivery; checkout itself goes
    // through, because soft calculation is on by default.
    await setZone({ freeDeliveryFrom: null, minOrderTotal: order.basketTotal + 100 });
    order = await check("delivery");
    expect(order.delivery).to.include({ allowed: false, message: "Minimum order amount: %s" });

    // No zone that can take an order: no delivery, and nothing to fall back on.
    await setZone({ minOrderTotal: null, enable: false });
    order = await check("delivery");
    expect(order.delivery).to.include({ allowed: false, message: "Delivery is not available" });
    expect(order.delivery.diagnostics).to.include("no delivery zones configured");
    expect(order.deliveryCost).to.equal(0);
  });
});
