import { expect } from "chai";
import {
  DeliveryZoneImportService,
  sourceHashOf,
  validateSnapshot,
} from "../../adapters/delivery/default/zone-import";
import { DeliveryZoneSnapshot, ImportedDeliveryZone } from "../../adapters/delivery/contracts";

/**
 * The import service is tested against an in-memory model rather than the real
 * one: what matters is which fields it writes and which it refuses to touch,
 * and that is a property of the service, not of the datastore.
 */
describe("Delivery zone import", function () {
  const ring = [
    [9, 9],
    [11, 9],
    [11, 11],
    [9, 11],
    [9, 9],
  ];

  function snapshot(zones: Partial<ImportedDeliveryZone>[], extra: Partial<DeliveryZoneSnapshot> = {}): DeliveryZoneSnapshot {
    return { source: "kml", fetchedAt: "2026-08-20T00:00:00Z", zones: zones as ImportedDeliveryZone[], ...extra };
  }

  let rows: any[] = [];
  let originalModel: any;

  beforeEach(function () {
    originalModel = (global as any).DeliveryZone;
    (global as any).DeliveryZone = {
      find: async (criteria: any) => rows.filter((row) => row.source === criteria.source),
      create: (values: any) => ({
        fetch: async () => {
          rows.push({ ...values });
          return values;
        },
      }),
      updateOne: async (criteria: any, values: any) => {
        const row = rows.find((item) => item.id === criteria.id);
        Object.assign(row, values);
        return row;
      },
    };
  });

  afterEach(function () {
    (global as any).DeliveryZone = originalModel;
    rows = [];
  });

  describe("validation", function () {
    it("accepts a well-formed snapshot", function () {
      expect(validateSnapshot(snapshot([{ externalId: "a", name: "A", polygon: ring }]))).to.deep.equal([]);
    });

    it("refuses a zone without a stable external id", function () {
      expect(validateSnapshot(snapshot([{ name: "A", polygon: ring }]))[0]).to.contain("no external id");
    });

    it("refuses an unusable polygon and a duplicated id", function () {
      expect(validateSnapshot(snapshot([{ externalId: "a", name: "A", polygon: [[0, 0]] }]))[0])
        .to.contain("unusable polygon");
      expect(
        validateSnapshot(snapshot([
          { externalId: "a", name: "A", polygon: ring },
          { externalId: "a", name: "B", polygon: ring },
        ]))[0],
      ).to.contain("more than once");
    });

    it("reports every problem, not just the first", function () {
      expect(validateSnapshot(snapshot([
        { name: "A", polygon: ring },
        { name: "B", polygon: ring },
      ]))).to.have.length(2);
    });
  });

  it("leaves existing zones untouched when the snapshot is invalid", async function () {
    rows = [{ id: "z1", source: "kml", externalId: "a", name: "A", polygon: ring, deliveryCost: 300 }];
    const before = JSON.stringify(rows);

    const result = await DeliveryZoneImportService.apply(
      snapshot([{ externalId: "a", name: "renamed", polygon: [[0, 0]] }]),
    );

    expect(result.errors).to.not.be.empty;
    expect(JSON.stringify(rows)).to.equal(before);
  });

  it("writes nothing during a dry run but reports the diff", async function () {
    rows = [{ id: "z1", source: "kml", externalId: "a", name: "A", polygon: ring }];
    const before = JSON.stringify(rows);

    const result = await DeliveryZoneImportService.apply(
      snapshot([
        { externalId: "a", name: "renamed", polygon: ring },
        { externalId: "b", name: "B", polygon: ring },
      ]),
      { dryRun: true },
    );

    expect(result.stats.updated).to.equal(1);
    expect(result.stats.created).to.equal(1);
    expect(JSON.stringify(rows)).to.equal(before);
    expect(result.entries.find((entry) => entry.action === "update")?.changes).to.contain("name");
  });

  it("never overwrites what the operator owns", async function () {
    rows = [{
      id: "z1",
      source: "kml",
      externalId: "a",
      name: "A",
      polygon: ring,
      deliveryCost: 300,
      deliveryItem: "dish-1",
      minOrderTotal: 500,
      freeDeliveryFrom: 2000,
      placeId: "kitchen-1",
      enable: false,
      sortOrder: 7,
      worktime: [{ dayOfWeek: "monday" }],
      description: "operator wrote this",
      customData: { note: "keep" },
    }];

    await DeliveryZoneImportService.apply(
      snapshot([{ externalId: "a", name: "renamed", description: "from kml", polygon: ring }]),
    );

    const zone = rows[0];
    expect(zone.deliveryCost).to.equal(300);
    expect(zone.deliveryItem).to.equal("dish-1");
    expect(zone.minOrderTotal).to.equal(500);
    expect(zone.freeDeliveryFrom).to.equal(2000);
    expect(zone.placeId).to.equal("kitchen-1");
    expect(zone.enable).to.equal(false);
    expect(zone.sortOrder).to.equal(7);
    expect(zone.worktime).to.deep.equal([{ dayOfWeek: "monday" }]);
    expect(zone.customData).to.deep.equal({ note: "keep" });
    // The name is source-owned, the description is not — operators write
    // delivery terms into it.
    expect(zone.name).to.equal("renamed");
    expect(zone.description).to.equal("operator wrote this");
  });

  it("creates zones switched off and layers switched on", async function () {
    await DeliveryZoneImportService.apply(
      snapshot([{ externalId: "a", name: "A", polygon: ring, layer: { externalId: "L", name: "Downtown" } }]),
    );

    const layer = rows.find((row) => row.externalId === "L");
    const zone = rows.find((row) => row.externalId === "a");
    // The zone waits for someone to price it; the layer does not, because a
    // layer that is off would keep its zones off however they are switched.
    expect(zone.enable).to.equal(false);
    expect(layer.enable).to.equal(undefined);
  });

  it("moves descriptions only when the source is allowed to own them", async function () {
    rows = [{ id: "z1", source: "kml", externalId: "a", name: "A", polygon: ring, description: "local" }];

    await DeliveryZoneImportService.apply(
      snapshot([{ externalId: "a", name: "A", description: "from kml", polygon: ring }], { updateDescriptions: true }),
    );

    expect(rows[0].description).to.equal("from kml");
  });

  it("changes nothing on a repeated snapshot", async function () {
    const stable = snapshot([{ externalId: "a", name: "A", polygon: ring }]);
    await DeliveryZoneImportService.apply(stable);
    const afterFirst = JSON.stringify(rows);

    const result = await DeliveryZoneImportService.apply(stable);

    expect(result.stats.unchanged).to.equal(1);
    expect(result.stats.updated).to.equal(0);
    expect(JSON.stringify(rows)).to.equal(afterFirst);
  });

  it("marks a zone missing from the source instead of deleting it", async function () {
    rows = [
      { id: "z1", source: "kml", externalId: "a", name: "A", polygon: ring, sourceHash: sourceHashOf({ externalId: "a", name: "A", polygon: ring }) },
      { id: "z2", source: "kml", externalId: "gone", name: "Gone", polygon: ring, deliveryCost: 900 },
    ];

    const result = await DeliveryZoneImportService.apply(snapshot([{ externalId: "a", name: "A", polygon: ring }]));

    expect(result.stats.missing).to.equal(1);
    expect(rows).to.have.length(2);
    expect(rows[1].missingFromSourceAt).to.be.a("number");
    expect(rows[1].deliveryCost).to.equal(900);
  });

  it("clears the mark when a zone comes back", async function () {
    rows = [{ id: "z1", source: "kml", externalId: "a", name: "A", polygon: ring, missingFromSourceAt: 1 }];

    await DeliveryZoneImportService.apply(snapshot([{ externalId: "a", name: "A", polygon: ring }]));

    expect(rows[0].missingFromSourceAt).to.equal(null);
  });

  it("ignores zones belonging to another source", async function () {
    rows = [{ id: "z9", source: "other", externalId: "a", name: "Other", polygon: ring }];

    const result = await DeliveryZoneImportService.apply(snapshot([{ externalId: "a", name: "A", polygon: ring }]));

    expect(result.stats.missing).to.equal(0);
    expect(rows.find((row) => row.id === "z9").name).to.equal("Other");
  });

  describe("cities", function () {
    it("does not declare another city's zones missing", async function () {
      // The expensive mistake this scopes away from: one KML per city, and the
      // first city to sync decides every other city has lost all its zones.
      rows = [
        { id: "z1", source: "kml", city: "voronezh", externalId: "a", name: "A", polygon: ring },
        { id: "z2", source: "kml", city: "lipetsk", externalId: "a", name: "A", polygon: ring },
      ];

      const result = await DeliveryZoneImportService.apply(
        snapshot([{ externalId: "a", name: "A", polygon: ring }], { city: "voronezh" }),
      );

      expect(result.stats.missing).to.equal(0);
      expect(rows[1].missingFromSourceAt).to.equal(undefined);
    });

    it("treats the same external id in two cities as two zones", async function () {
      rows = [{ id: "z1", source: "kml", city: "voronezh", externalId: "a", name: "Voronezh A", polygon: ring }];

      const result = await DeliveryZoneImportService.apply(
        snapshot([{ externalId: "a", name: "Lipetsk A", polygon: ring }], { city: "lipetsk" }),
      );

      expect(result.stats.created).to.equal(1);
      expect(result.stats.updated).to.equal(0);
      expect(rows).to.have.length(2);
      expect(rows[0].name).to.equal("Voronezh A");
    });

    it("keeps a single-city installation working with no city at all", async function () {
      rows = [{ id: "z1", source: "kml", externalId: "a", name: "A", polygon: ring }];

      const result = await DeliveryZoneImportService.apply(
        snapshot([{ externalId: "a", name: "renamed", polygon: ring }]),
      );

      // `undefined` on the row, `undefined` in the snapshot: the same city.
      expect(result.stats.updated).to.equal(1);
      expect(result.city).to.equal(null);
      expect(rows).to.have.length(1);
    });
  });

  describe("layers", function () {
    it("creates a layer row and points its zones at it", async function () {
      const layer = { externalId: "layer:North", name: "North" };

      const result = await DeliveryZoneImportService.apply(
        snapshot([
          { externalId: "z1", name: "A", polygon: ring, layer },
          { externalId: "z2", name: "B", polygon: ring, layer },
        ]),
      );

      // Three rows: one layer and two zones, one create each.
      expect(result.stats.created).to.equal(3);
      expect(rows).to.have.length(3);

      const layerRow = rows.find((row) => row.externalId === "layer:North");
      expect(layerRow).to.not.equal(undefined);
      // A layer is a row without geometry. That is the whole difference.
      expect(layerRow.polygon).to.equal(undefined);

      const zones = rows.filter((row) => row.externalId !== "layer:North");
      expect(zones.map((row) => row.parent)).to.deep.equal([layerRow.id, layerRow.id]);
    });

    it("leaves a zone with no layer unparented", async function () {
      await DeliveryZoneImportService.apply(snapshot([{ externalId: "z1", name: "A", polygon: ring }]));

      expect(rows).to.have.length(1);
      expect(rows[0].parent).to.equal(null);
    });

    it("reuses the layer row on the next run", async function () {
      const layer = { externalId: "layer:North", name: "North" };
      const zones = [{ externalId: "z1", name: "A", polygon: ring, layer }];

      await DeliveryZoneImportService.apply(snapshot(zones));
      const layerId = rows.find((row) => row.externalId === "layer:North").id;

      const again = await DeliveryZoneImportService.apply(snapshot(zones));

      expect(rows).to.have.length(2);
      expect(again.stats.created).to.equal(0);
      expect(rows.find((row) => row.externalId === "z1").parent).to.equal(layerId);
    });

    it("moves a zone when the source moves it between folders", async function () {
      const north = { externalId: "layer:North", name: "North" };
      const south = { externalId: "layer:South", name: "South" };

      await DeliveryZoneImportService.apply(snapshot([{ externalId: "z1", name: "A", polygon: ring, layer: north }]));
      await DeliveryZoneImportService.apply(snapshot([{ externalId: "z1", name: "A", polygon: ring, layer: south }]));

      const southId = rows.find((row) => row.externalId === "layer:South").id;
      expect(rows.find((row) => row.externalId === "z1").parent).to.equal(southId);
    });

    it("does not report a layer as missing while the source still lists it", async function () {
      const layer = { externalId: "layer:North", name: "North" };
      const zones = [{ externalId: "z1", name: "A", polygon: ring, layer }];

      await DeliveryZoneImportService.apply(snapshot(zones));
      const again = await DeliveryZoneImportService.apply(snapshot(zones));

      expect(again.stats.missing).to.equal(0);
    });
  });
});
