import { expect } from "chai";
import { applyZone } from "../../../../adapters/delivery/default/zone-calculation";

/**
 * A zone's delivery terms for a basket of a given total: closed outside its
 * hours, refused below its minimum order, free from its threshold, charged by
 * its delivery product or by its cost.
 */
describe("Delivery zone tariff", function () {
  const zone1 = { id: "zone-1", name: "Zone 1", minDeliveryTime: 30, deliveryCost: 150, deliveryMessage: "Message 1" } as any;
  const priced = (zone: any, total: number) => applyZone({ ...zone1, ...zone }, total);

  it("charges the zone's cost and passes on its time and message", async function () {
    expect(await priced({}, 1000)).to.include({
      allowed: true, cost: 150, deliveryTimeMinutes: 30, message: "Message 1", zoneId: "zone-1", zoneName: "Zone 1",
    });
  });

  it("refuses a basket below the zone's minimum order", async function () {
    const delivery = await priced({ minOrderTotal: 500 }, 400);
    expect(delivery).to.include({ allowed: false, cost: 0, message: "Minimum order amount: %s" });
    expect(delivery.messageArgs).to.deep.equal(["500"]);
    expect((await priced({ minOrderTotal: 500 }, 600)).allowed).to.equal(true);
  });

  it("delivers for free from the zone's threshold; zero or unset is no free delivery", async function () {
    expect(await priced({ freeDeliveryFrom: 2000 }, 2000)).to.include({ allowed: true, cost: 0, message: "Free delivery" });
    expect((await priced({ freeDeliveryFrom: 2000 }, 1999)).cost).to.equal(150);
    expect((await priced({ freeDeliveryFrom: 0 }, 1000)).cost).to.equal(150);
  });

  it("charges a delivery product instead of a cost when the zone names one", async function () {
    expect(await priced({ deliveryItem: "dish-1" }, 1000)).to.include({ allowed: true, cost: undefined, item: "dish-1" });
  });

  it("is closed outside the zone's hours", async function () {
    const never = [{ dayOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"], start: "00:00", stop: "00:01" }];
    expect(await priced({ worktime: never }, 1000)).to.include({
      allowed: false, cost: 0, message: "At the moment, the delivery area does not work, try it later",
    });
  });
});
