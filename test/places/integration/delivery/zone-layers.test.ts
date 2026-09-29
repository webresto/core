import { expect } from "chai";
import { resetDatabase } from "../../support/reset";
import { thrown } from "../../support/storefront";

/**
 * Layers: a layer is a zone row without a polygon that groups zones. Three
 * rules, and they are not the same rule:
 *
 * - terms are the layer's when it lends them (`termsApplyToZones`, on by
 *   default), the zone's own otherwise;
 * - enable is combined: a layer that is off takes its zones with it;
 * - order is a pair: the layer's number places the layer, the zone's own orders
 *   it inside.
 *
 * `findServing` resolves all of it, so everything downstream reads a zone as if
 * layers did not exist. The model also refuses a row that ends up with no
 * delivery time or cost of its own or lent.
 */
describe("Delivery zone layers", function () {
  const RING = [[9, 9], [11, 9], [11, 11], [9, 11], [9, 9]];
  const TERMS = { minDeliveryTime: 30, deliveryCost: 100 };

  beforeEach(async function () {
    await resetDatabase();
  });

  const layer = (name: string, values: Record<string, unknown> = {}) =>
    DeliveryZone.create({ name, polygon: [], ...TERMS, ...values }).fetch();
  const zone = (name: string, values: Record<string, unknown> = {}) =>
    DeliveryZone.create({ name, polygon: RING, ...values }).fetch();
  const serving = async () => (await DeliveryZone.findServing()).map((row: any) => row.name);

  it("leaves a zone without a layer exactly as it is", async function () {
    await zone("Zone 1", { ...TERMS, sortOrder: 5 });

    const [row] = await DeliveryZone.findServing();
    expect(row).to.include({ name: "Zone 1", deliveryCost: 100, sortOrder: 5 });
  });

  describe("terms", function () {
    it("prices a zone by its layer and ignores its own tariff", async function () {
      const layer1 = await layer("Layer 1", { deliveryCost: 300, minOrderTotal: 900 });
      await zone("Zone 1", { parent: layer1.id, ...TERMS, minOrderTotal: 0 });

      const rows = await DeliveryZone.findServing();
      expect(rows).to.have.length(1);
      expect(rows[0]).to.include({ name: "Zone 1", deliveryCost: 300, minOrderTotal: 900 });
    });

    it("leaves the zone its own tariff when the layer only groups", async function () {
      const layer1 = await layer("Layer 1", { termsApplyToZones: false, deliveryCost: 300, minOrderTotal: 900 });
      await zone("Zone 1", { parent: layer1.id, ...TERMS, minOrderTotal: 0 });

      expect((await DeliveryZone.findServing())[0]).to.include({ deliveryCost: 100, minOrderTotal: 0 });
    });

    it("keeps the zone's own geometry and identity either way", async function () {
      const layer1 = await layer("Layer 1", { deliveryCost: 300 });
      await zone("Zone 1", { parent: layer1.id, source: "kml", externalId: "external-1" });

      const [row] = await DeliveryZone.findServing();
      expect(row.polygon).to.deep.equal(RING);
      expect(row).to.include({ name: "Zone 1", externalId: "external-1" });
    });
  });

  describe("enable", function () {
    it("a layer that is off takes every zone in it off, whoever owns the terms", async function () {
      const lending = await layer("Layer 1", { enable: false });
      const grouping = await layer("Layer 2", { enable: false, termsApplyToZones: false });
      await zone("Zone 1", { parent: lending.id, enable: true });
      await zone("Zone 2", { parent: grouping.id, enable: true, ...TERMS });

      expect(await serving()).to.deep.equal([]);
    });

    it("a layer that is on leaves each zone its own switch", async function () {
      const layer1 = await layer("Layer 1");
      await zone("Zone 1", { parent: layer1.id, enable: false });
      await zone("Zone 2", { parent: layer1.id, enable: true });

      expect(await serving()).to.deep.equal(["Zone 2"]);
    });

    it("a zone switched off outside any layer is dropped", async function () {
      await zone("Zone 1", { ...TERMS, enable: false });
      expect(await serving()).to.deep.equal([]);
    });
  });

  describe("order", function () {
    it("places a layer's zones by the layer, and orders them inside it by their own number", async function () {
      const early = await layer("Layer 1", { sortOrder: 1 });
      const late = await layer("Layer 2", { sortOrder: 9 });
      await zone("Zone 2a", { parent: late.id, sortOrder: 2 });
      await zone("Zone 2b", { parent: late.id, sortOrder: 1 });
      await zone("Zone 1a", { parent: early.id, sortOrder: 7 });

      expect(await serving()).to.deep.equal(["Zone 1a", "Zone 2b", "Zone 2a"]);
    });

    it("sorts a loose zone against the layers by its own number, and keeps the zone's number readable", async function () {
      const layer1 = await layer("Layer 1", { sortOrder: 5 });
      await zone("Zone 1", { parent: layer1.id, sortOrder: 3 });
      await zone("Zone 2", { ...TERMS, sortOrder: 4 });

      const rows = await DeliveryZone.findServing();
      expect(rows.map((row: any) => row.name)).to.deep.equal(["Zone 2", "Zone 1"]);
      expect(rows[1].sortOrder).to.equal(3);
    });
  });

  it("never serves the layer itself", async function () {
    const layer1 = await layer("Layer 1");
    await zone("Zone 1", { parent: layer1.id });

    expect(await serving()).to.deep.equal(["Zone 1"]);
  });

  it("serves a zone whose layer was deleted by its own terms", async function () {
    const layer1 = await layer("Layer 1", { deliveryCost: 300 });
    await zone("Zone 1", { parent: layer1.id, ...TERMS });
    await DeliveryZone.destroy({ id: layer1.id }).fetch();

    const [row] = await DeliveryZone.findServing();
    expect(row).to.include({ name: "Zone 1", deliveryCost: 100 });
  });

  describe("a row needs a delivery time and cost, its own or lent", function () {
    const refused = async (write: Promise<unknown>) => String(await thrown(write));

    it("a layer states both, a zero cost included", async function () {
      expect(await refused(DeliveryZone.create({ name: "Layer 1", polygon: [] }).fetch()))
        .to.contain("needs minDeliveryTime and deliveryCost");
      expect(await thrown(layer("Layer 2", { deliveryCost: 0 }))).to.equal(null);
    });

    it("a zone outside any layer states both", async function () {
      expect(await refused(zone("Zone 1", { deliveryCost: 200 }))).to.contain("needs minDeliveryTime:");
    });

    it("a zone in a layer that lends them needs none, in one that only groups it does", async function () {
      const lending = await layer("Layer 1");
      const grouping = await layer("Layer 2", { termsApplyToZones: false });

      expect(await thrown(zone("Zone 1", { parent: lending.id }))).to.equal(null);
      expect(await refused(zone("Zone 2", { parent: grouping.id }))).to.contain("its layer leaves the terms to each zone");
    });

    describe("on update, the row is judged as it will be", function () {
      it("clearing a loose zone's cost is refused", async function () {
        const zone1 = await zone("Zone 1", TERMS);
        expect(await refused(DeliveryZone.update({ id: zone1.id }, { id: zone1.id, deliveryCost: null }).fetch()))
          .to.contain("needs deliveryCost");
      });

      it("an update that does not carry the layer keeps the stored one", async function () {
        // The locked editor writes the operator's fields, and the parent is not one.
        const layer1 = await layer("Layer 1");
        const zone1 = await zone("Zone 1", { parent: layer1.id });
        const write = DeliveryZone.update({ id: zone1.id }, { id: zone1.id, minDeliveryTime: null, deliveryCost: null, enable: false }).fetch();
        expect(await thrown(write)).to.equal(null);
      });

      it("taking a zone with no terms of its own out of a lending layer is refused", async function () {
        const layer1 = await layer("Layer 1");
        const zone1 = await zone("Zone 1", { parent: layer1.id });
        expect(await refused(DeliveryZone.update({ id: zone1.id }, { id: zone1.id, parent: null }).fetch()))
          .to.contain("it has no layer to take them from");
      });

      it("an update that writes neither the terms nor the layer is not asked about them", async function () {
        const zone1 = await zone("Zone 1", TERMS);
        expect(await thrown(DeliveryZone.update({ id: zone1.id }, { missingFromSourceAt: 1 }).fetch())).to.equal(null);
      });

      it("an update that writes them has to name its row in the values", async function () {
        // Waterline hands the hook the values, not the row.
        const zone1 = await zone("Zone 1", TERMS);
        expect(await refused(DeliveryZone.update({ id: zone1.id }, { deliveryCost: 150 }).fetch()))
          .to.contain("has to carry the row id");
      });
    });
  });
});
