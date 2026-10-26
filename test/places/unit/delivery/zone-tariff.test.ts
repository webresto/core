import { expect } from "chai";
import { applyZone, describeZone } from "../../../../adapters/delivery/default/zone-calculation";

/**
 * A zone's delivery terms for a basket of a given total: refused below its
 * minimum order, free from its threshold, charged by its delivery product or
 * by its cost.
 */
describe("Delivery zone tariff", function () {
  const zone1 = { id: "zone-1", name: "Zone 1", minDeliveryTime: 30, deliveryCost: 150, deliveryMessage: "Message 1" } as any;
  const priced = (zone: any, total: number) => applyZone({ ...zone1, ...zone }, total);

  // The catalog a delivery product is priced from: one product.
  before(function () {
    (global as any).Dish = {
      findOne: async ({ where }: any) => (where.or.some((key: any) => key.id === "dish-1") ? { price: 250 } : undefined),
    };
  });
  after(function () {
    delete (global as any).Dish;
  });

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

  describe("the zone's name and terms", function () {
    const terms = { minOrderTotal: 500, freeDeliveryFrom: 2000 };
    const expected = {
      zoneId: "zone-1", zoneName: "Zone 1", minOrderTotal: 500, freeDeliveryFrom: 2000,
      deliveryCost: 150, zoneDescription: null,
    };

    it("ride on every answer the zone gives a basket: priced, refused, free", async function () {
      for (const total of [1000, 100, 2500]) {
        expect(await priced(terms, total)).to.include(expected);
      }
    });

    it("quote the zone's cost when this basket pays none of it: refused or free", async function () {
      expect(await priced(terms, 100)).to.include({ allowed: false, cost: 0, deliveryCost: 150 });
      expect(await priced(terms, 2500)).to.include({ allowed: true, cost: 0, deliveryCost: 150 });
    });

    it("quote a delivery product's price as the cost; a product not in the catalog charges nothing", async function () {
      expect(await priced({ ...terms, deliveryItem: "dish-1" }, 1000)).to.include({ ...expected, cost: undefined, deliveryCost: 250 });
      expect((await priced({ deliveryItem: "dish-2" }, 1000)).deliveryCost).to.equal(0);
    });

    it("quote a zero cost as a free delivery, not as none", async function () {
      expect((await priced({ deliveryCost: 0 }, 1000)).deliveryCost).to.equal(0);
    });

    it("quote the operator's description as written", async function () {
      expect(await priced({ description: "Description 1" }, 1000)).to.include({ message: "Message 1", zoneDescription: "Description 1" });
      expect(await describeZone({ ...zone1, description: "Description 1" })).to.include({ message: "Description 1", zoneDescription: "Description 1" });
    });

    it("ride on the answer before any basket, with the message kept in words", async function () {
      const delivery = await describeZone({ ...zone1, ...terms });
      expect(delivery).to.include(expected);
      expect(delivery.message).to.equal("Delivery cost: %s\nMinimum order price: %s\nFree delivery for orders above: %s");
    });

    it("are null when the zone sets no minimum and no threshold, zero included", async function () {
      for (const zone of [{}, { minOrderTotal: 0, freeDeliveryFrom: 0 }, { minOrderTotal: null, freeDeliveryFrom: null }]) {
        expect(await priced(zone, 1000)).to.include({ minOrderTotal: null, freeDeliveryFrom: null });
        expect(await describeZone({ ...zone1, ...zone })).to.include({ minOrderTotal: null, freeDeliveryFrom: null });
      }
    });
  });
});
