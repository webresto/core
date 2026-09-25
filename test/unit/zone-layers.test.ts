import { expect } from "chai";
import { pickInheritedFields } from "../../lib/delivery/inherited-terms";

/**
 * Layers: three rules, and they are not the same rule.
 *
 * `findServing` is where all of it lives, so this drives it through the model
 * global with a stubbed `find`. Everything downstream — matching, pricing, the
 * promised time — reads what comes out of here and never learns that layers
 * exist, which is exactly what the test is protecting.
 */
describe("Delivery zone layers", function () {
  const ring = [
    [9, 9],
    [11, 9],
    [11, 11],
    [9, 11],
    [9, 9],
  ];

  let rows: any[] = [];
  let originalModel: any;
  let findServing: () => Promise<any[]>;

  beforeEach(function () {
    originalModel = (global as any).DeliveryZone;

    // The model file assigns `module.exports`, so the method has to be reached
    // the way the application reaches it: off the global.
    delete require.cache[require.resolve("../../models/DeliveryZone")];
    const model = require("../../models/DeliveryZone");
    (global as any).DeliveryZone = {
      ...model,
      find: async () => rows,
      findOne: async (criteria: any) => rows.find((row) => row.id === criteria.id),
    };
    findServing = () => (global as any).DeliveryZone.findServing();
  });

  afterEach(function () {
    (global as any).DeliveryZone = originalModel;
    rows = [];
  });

  it("leaves a zone without a layer exactly as it is", async function () {
    rows = [{ id: "z1", polygon: ring, enable: true, deliveryCost: 100, sortOrder: 5 }];

    const serving = await findServing();

    expect(serving).to.have.length(1);
    expect(serving[0].deliveryCost).to.equal(100);
    expect(serving[0].sortOrder).to.equal(5);
  });

  describe("terms", function () {
    it("prices a zone by its layer and ignores its own tariff", async function () {
      rows = [
        { id: "layer", polygon: null, enable: true, deliveryCost: 300, minOrderTotal: 900 },
        { id: "z1", parent: "layer", polygon: ring, enable: true, deliveryCost: 100, minOrderTotal: 0 },
      ];

      const serving = await findServing();

      expect(serving).to.have.length(1);
      expect(serving[0].id).to.equal("z1");
      expect(serving[0].deliveryCost).to.equal(300);
      expect(serving[0].minOrderTotal).to.equal(900);
    });

    it("leaves the zone its own tariff when the layer only groups", async function () {
      rows = [
        { id: "layer", polygon: null, enable: true, termsApplyToZones: false, deliveryCost: 300, minOrderTotal: 900 },
        { id: "z1", parent: "layer", polygon: ring, enable: true, deliveryCost: 100, minOrderTotal: 0 },
      ];

      const serving = await findServing();

      expect(serving).to.have.length(1);
      expect(serving[0].deliveryCost).to.equal(100);
      expect(serving[0].minOrderTotal).to.equal(0);
    });

    it("treats a layer with no answer as one that prices its zones", async function () {
      rows = [
        { id: "layer", polygon: null, enable: true, deliveryCost: 300 },
        { id: "z1", parent: "layer", polygon: ring, enable: true, deliveryCost: 100 },
      ];

      expect((await findServing())[0].deliveryCost).to.equal(300);
    });

    it("keeps the zone's own geometry and identity either way", async function () {
      rows = [
        { id: "layer", polygon: null, enable: true, deliveryCost: 300 },
        { id: "z1", parent: "layer", polygon: ring, enable: true, externalId: "kml-1", name: "North" },
      ];

      const serving = await findServing();

      expect(serving[0].polygon).to.deep.equal(ring);
      expect(serving[0].externalId).to.equal("kml-1");
      expect(serving[0].name).to.equal("North");
    });
  });

  describe("enable", function () {
    it("switches off every zone of a disabled layer", async function () {
      rows = [
        { id: "layer", polygon: null, enable: false },
        { id: "z1", parent: "layer", polygon: ring, enable: true },
      ];

      expect(await findServing()).to.have.length(0);
    });

    it("still switches off one zone inside a layer that is on", async function () {
      rows = [
        { id: "layer", polygon: null, enable: true },
        { id: "z1", parent: "layer", polygon: ring, enable: false },
        { id: "z2", parent: "layer", polygon: ring, enable: true },
      ];

      const serving = await findServing();

      expect(serving.map((zone: any) => zone.id)).to.deep.equal(["z2"]);
    });

    it("does not let the layer's switch depend on who owns the terms", async function () {
      rows = [
        { id: "layer", polygon: null, enable: false, termsApplyToZones: false },
        { id: "z1", parent: "layer", polygon: ring, enable: true },
      ];

      expect(await findServing()).to.have.length(0);
    });

    it("still drops a zone the operator disabled outside any layer", async function () {
      rows = [{ id: "z1", polygon: ring, enable: false }];

      expect(await findServing()).to.have.length(0);
    });
  });

  describe("order", function () {
    it("places a layer's zones by the layer, and orders them inside it by their own", async function () {
      rows = [
        { id: "early", polygon: null, enable: true, sortOrder: 1 },
        { id: "late", polygon: null, enable: true, sortOrder: 9 },
        { id: "late-a", parent: "late", polygon: ring, enable: true, sortOrder: 2 },
        { id: "late-b", parent: "late", polygon: ring, enable: true, sortOrder: 1 },
        { id: "early-a", parent: "early", polygon: ring, enable: true, sortOrder: 7 },
      ];

      const serving = await findServing();

      expect(serving.map((zone: any) => zone.id)).to.deep.equal(["early-a", "late-b", "late-a"]);
    });

    it("sorts a loose zone against the layers by its own number", async function () {
      rows = [
        { id: "layer", polygon: null, enable: true, sortOrder: 5 },
        { id: "inside", parent: "layer", polygon: ring, enable: true, sortOrder: 0 },
        { id: "loose", polygon: ring, enable: true, sortOrder: 2 },
      ];

      const serving = await findServing();

      expect(serving.map((zone: any) => zone.id)).to.deep.equal(["loose", "inside"]);
    });

    it("keeps the zone's own number readable rather than the layer's", async function () {
      rows = [
        { id: "layer", polygon: null, enable: true, sortOrder: 5 },
        { id: "z1", parent: "layer", polygon: ring, enable: true, sortOrder: 3 },
      ];

      expect((await findServing())[0].sortOrder).to.equal(3);
    });
  });

  it("never serves the layer itself", async function () {
    rows = [
      { id: "layer", polygon: null, enable: true, deliveryCost: 300 },
      { id: "z1", parent: "layer", polygon: ring, enable: true },
    ];

    const serving = await findServing();

    expect(serving.map((zone: any) => zone.id)).to.deep.equal(["z1"]);
  });

  it("ignores a parent that is not there", async function () {
    // Not a case the model allows — `assertZone` refuses it on write — but the
    // read path must not throw on a row somebody deleted the layer of.
    rows = [{ id: "z1", parent: "gone", polygon: ring, enable: true, deliveryCost: 100 }];

    const serving = await findServing();

    expect(serving).to.have.length(1);
    expect(serving[0].deliveryCost).to.equal(100);
  });

  /**
   * A row states its own time and cost unless its layer lends its terms. The
   * answer depends on the parent, so the rule lives in the lifecycle hooks and
   * is driven through them here.
   */
  describe("required terms", function () {
    const hook = (name: "beforeCreate" | "beforeUpdate", values: any) =>
      new Promise<string | undefined>((resolve) => (global as any).DeliveryZone[name](values, resolve));

    const lending = { id: "layer", polygon: [], termsApplyToZones: true, minDeliveryTime: 40, deliveryCost: 200 };
    const grouping = { ...lending, termsApplyToZones: false };

    it("refuses a layer without terms", async function () {
      const error = await hook("beforeCreate", { name: "North", polygon: [] });
      expect(error).to.contain("needs minDeliveryTime and deliveryCost");
    });

    it("saves a layer that states both, a zero cost included", async function () {
      expect(await hook("beforeCreate", { name: "North", polygon: [], minDeliveryTime: 40, deliveryCost: 0 })).to.equal(undefined);
    });

    it("refuses a zone outside any layer that states only one of the two", async function () {
      const error = await hook("beforeCreate", { name: "A", polygon: ring, deliveryCost: 200 });
      expect(error).to.contain("needs minDeliveryTime:");
    });

    it("saves a zone without terms in a layer that lends them", async function () {
      rows = [lending];
      expect(await hook("beforeCreate", { name: "A", polygon: ring, parent: "layer" })).to.equal(undefined);
    });

    it("refuses a zone without terms in a layer that only groups", async function () {
      rows = [grouping];
      const error = await hook("beforeCreate", { name: "A", polygon: ring, parent: "layer" });
      expect(error).to.contain("its layer leaves the terms to each zone");
    });

    describe("on update", function () {
      it("judges the row as it will be: clearing a loose zone's cost is refused", async function () {
        rows = [{ id: "z1", name: "A", polygon: ring, parent: null, minDeliveryTime: 40, deliveryCost: 200 }];
        expect(await hook("beforeUpdate", { id: "z1", deliveryCost: null })).to.contain("needs deliveryCost");
      });

      it("keeps the stored layer when the update does not carry one", async function () {
        // The locked editor writes the operator's fields, and the parent is not one.
        rows = [lending, { id: "z1", name: "A", polygon: ring, parent: "layer" }];
        expect(await hook("beforeUpdate", { id: "z1", minDeliveryTime: null, deliveryCost: null, enable: false })).to.equal(undefined);
      });

      it("refuses taking a zone out of a lending layer when it has no terms of its own", async function () {
        rows = [lending, { id: "z1", name: "A", polygon: ring, parent: "layer" }];
        expect(await hook("beforeUpdate", { id: "z1", parent: null })).to.contain("it has no layer to take them from");
      });

      it("does not ask about terms when the update writes neither them nor the layer", async function () {
        expect(await hook("beforeUpdate", { missingFromSourceAt: 1 })).to.equal(undefined);
      });

      it("wants the row id when it does write them", async function () {
        expect(await hook("beforeUpdate", { deliveryCost: 100 })).to.contain("has to carry the row id");
      });
    });
  });
});

describe("Delivery zone inherited terms", function () {
  it("lends the terms and nothing else", function () {
    const layer = { id: "layer", name: "Layer", enable: false, sortOrder: 3, deliveryCost: 100, minDeliveryTime: 30 } as any;
    const inherited = pickInheritedFields(layer);
    expect(inherited).to.include({ deliveryCost: 100, minDeliveryTime: 30 });
    expect(inherited).to.not.have.any.keys("id", "name", "enable", "sortOrder");
  });
});
