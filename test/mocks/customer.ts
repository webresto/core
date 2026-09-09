import Customer from "../../interfaces/Customer";
import Address from "../../interfaces/Address";

export const customer: Customer = {
  phone:  {
    code: "+1",
    number: "9999999999"
  },
  name: "Piter Parker",
};

export const address: Address = {
  city: "New York",
  formatted: "Courtlandt Ave, 681",
  home: "681",
  comment: "My Bronx",
};

/**
 * Point an order at a place a pickup or dine-in order can actually go to.
 *
 * `Order.check` refuses one whose point is missing, closed or does not hand
 * orders over, so every test that checks out a pickup needs a real row and not
 * just the service type.
 */
export async function toPickup(orderId: string | undefined): Promise<void> {
  const point = await Place.findOrCreate({ id: "test-pickup-point" }, {
    id: "test-pickup-point",
    title: "Test pickup point",
    enable: true,
    isPickupPoint: true,
    hasDiningArea: true,
  });
  await Order.update({ id: orderId as string }, { pickupPoint: point.id }).fetch();
}