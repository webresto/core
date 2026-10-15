import { expect } from "chai";
import { applyZone, describeZone } from "../../../../adapters/delivery/default/zone-calculation";

/**
 * A zone's delivery terms for a basket of a given total: closed outside its
 * hours, refused below its minimum order, free from its threshold, charged by
 * its delivery product or by its cost.
 */
describe("Delivery zone tariff", function () {
  const zone1 = { id: "zone-1", name: "Zone 1", minDeliveryTime: 30, deliveryCost: 150, deliveryMessage: "Message 1" } as any;
  const priced = (zone: any, total: number) => applyZone({ ...zone1, ...zone }, total);
  const NEVER = [{ dayOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"], start: "00:00", stop: "00:01" }];

  it("charges the zone's cost and passes on its time and message", async function () {
    expect(await priced({}, 1000)).to.include({
      allowed: true, cost: 150, deliveryTimeMinutes: 30, message: "Message 1", zoneId: "zone-1", zoneName: "Zone 1",
    });
  });

  it("refuses a basket below the zone's minimum order; the minimum itself is enough", async function () {
    const delivery = await priced({ minOrderTotal: 500 }, 400);
    expect(delivery).to.include({ allowed: false, cost: 0, message: "Minimum order amount: %s" });
    expect(delivery.messageArgs).to.deep.equal(["500"]);
    expect((await priced({ minOrderTotal: 500 }, 500)).allowed).to.equal(true);
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
    expect(await priced({ worktime: NEVER }, 1000)).to.include({
      allowed: false, cost: 0, message: "At the moment, the delivery area does not work, try it later",
    });
  });

  describe("the zone's name and terms as numbers", function () {
    const terms = { minOrderTotal: 500, freeDeliveryFrom: 2000 };
    const expected = { zoneId: "zone-1", zoneName: "Zone 1", minOrderTotal: 500, freeDeliveryFrom: 2000 };

    it("ride on every answer the zone gives a basket: priced, refused, free, by product, closed", async function () {
      for (const [zone, total] of [
        [terms, 1000],
        [terms, 100],
        [terms, 2500],
        [{ ...terms, deliveryItem: "dish-1" }, 1000],
        [{ ...terms, worktime: NEVER }, 1000],
      ] as const) {
        expect(await priced(zone, total)).to.include(expected);
      }
    });

    it("ride on the answer before any basket, with the message kept in words", async function () {
      const delivery = await describeZone({ ...zone1, ...terms });
      expect(delivery).to.include(expected);
      expect(delivery.message).to.equal("Delivery cost: %s\nMinimum order price: %s\nFree delivery for orders above: %s");
    });

    it("are null when the zone sets none, zero included", async function () {
      for (const zone of [{}, { minOrderTotal: 0, freeDeliveryFrom: 0 }, { minOrderTotal: null, freeDeliveryFrom: null }]) {
        expect(await priced(zone, 1000)).to.include({ minOrderTotal: null, freeDeliveryFrom: null });
        expect(await describeZone({ ...zone1, ...zone })).to.include({ minOrderTotal: null, freeDeliveryFrom: null });
      }
    });
  });
});
