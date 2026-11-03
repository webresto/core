import { expect } from "chai";
import { NO_KITCHEN, orderIsOfPlace, orderPlaceId, orderPlaceKey } from "../../../../lib/order/orders-of-place";

/**
 * Which point an order belongs to — the one answer the board, the phone and their rights all read
 * (plan C1, C2). A delivery belongs to the kitchen the resolver assigned; pickup and dine-in to the
 * point the customer chose; a delivery with no kitchen yet belongs to «Без кухни» and to nothing
 * else, which is what keeps it out of every point's list.
 */
describe("The point of an order", function () {
  it("is the assigned kitchen of a delivery", function () {
    const order: any = { serviceType: "delivery", cookingPoints: ["kitchen-1", "kitchen-2"], pickupPoint: "counter-9" };

    expect(orderPlaceId(order)).to.equal("kitchen-1");
    expect(orderPlaceKey(order)).to.equal("kitchen-1");
  });

  it("is the chosen point of pickup and dine-in, whatever the kitchens say", function () {
    for (const serviceType of ["pickup", "dine-in"]) {
      const order: any = { serviceType, pickupPoint: { id: "counter-9" }, cookingPoints: ["kitchen-1"] };
      expect(orderPlaceId(order), serviceType).to.equal("counter-9");
    }
  });

  it("is «Без кухни» while a delivery has none", function () {
    expect(orderPlaceId({ serviceType: "delivery", cookingPoints: [] } as any)).to.equal(null);
    expect(orderPlaceKey({ serviceType: "delivery", cookingPoints: [] } as any)).to.equal(NO_KITCHEN);
    expect(orderPlaceKey({ serviceType: "delivery" } as any)).to.equal(NO_KITCHEN);
    expect(orderPlaceKey(null)).to.equal(NO_KITCHEN);
  });

  it("belongs to the points it is led by and to no other", function () {
    const ofA: any = { serviceType: "delivery", cookingPoints: ["place-a"] };
    const unassigned: any = { serviceType: "delivery", cookingPoints: [] };

    expect(orderIsOfPlace(ofA, ["place-a", NO_KITCHEN])).to.equal(true);
    expect(orderIsOfPlace(ofA, ["place-b"])).to.equal(false);
    expect(orderIsOfPlace(ofA, [])).to.equal(false);
    expect(orderIsOfPlace(unassigned, ["place-a"])).to.equal(false);
    expect(orderIsOfPlace(unassigned, [NO_KITCHEN])).to.equal(true);
  });
});
