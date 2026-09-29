import Customer from "../../interfaces/Customer";
import OrderAddress from "../../interfaces/OrderAddress";

export const customer: Customer = {
  phone:  {
    code: "+1",
    number: "9999999999"
  },
  name: "Piter Parker",
};

export const address: OrderAddress = {
  city: "New York",
  formatted: "Courtlandt Ave, 681",
  home: "681",
  comment: "My Bronx",
};

/**
 * The installation's one kitchen, which also takes pickup and dine-in.
 *
 * `Order.check` refuses an order no kitchen can take. With exactly one enabled
 * kitchen the default chain assigns it to any delivery (`single-point`), address
 * coordinate or not. The chain is set from its manifest here because the fixture
 * does not load the settings manifests.
 */
export async function testKitchen(): Promise<{ id: string }> {
  const chain = require("../../settings/kitchen_resolve_chain.json");
  await Settings.set("KITCHEN_RESOLVE_CHAIN", { ...chain, value: chain.defaultValue });
  return Place.findOrCreate({ id: "test-pickup-point" }, {
    id: "test-pickup-point",
    title: "Test pickup point",
    enable: true,
    isCookingPoint: true,
    isPickupPoint: true,
    hasDiningArea: true,
  });
}

/**
 * Point an order at a place a pickup or dine-in order can actually go to.
 *
 * `Order.check` refuses one whose point is missing, closed, does not hand
 * orders over or does not cook, so every test that checks out a pickup needs a
 * real row and not just the service type.
 */
export async function toPickup(orderId: string | undefined): Promise<void> {
  const point = await testKitchen();
  await Order.update({ id: orderId as string }, { pickupPoint: point.id }).fetch();
}