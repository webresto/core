import { expect } from "chai";
import {
  DeliveryZoneImportService,
  importLocalZones,
  sourceHashOf,
  validateSnapshot,
} from "../../../../adapters/delivery/default/zone-import";
import { DeliveryZoneSnapshot, ImportedDeliveryZone } from "../../../../interfaces/Delivery";
import { resetDatabase } from "../../support/reset";

/**
 * Zones from a source (a KML map) and from a file.
 *
 * A snapshot owns the geometry and the name; everything else on an existing
 * zone is the operator's and survives every run. New zones arrive switched off,
 * new layers switched on, and a new row that prices itself gets the time and
 * cost the operator gave the source. A zone the source no longer lists is
 * marked, never deleted. All of it is per city: one map per city.
 */
describe("Delivery zone import", function () {
  const RING = [[9, 9], [11, 9], [11, 11], [9, 11], [9, 9]];
  /** The time and cost the operator gave the import for new self-priced rows. */
  const terms = { minDeliveryTime: 60, deliveryCost: 250 };

  let city1: string;
  let city2: string;

  beforeEach(async function () {
    await resetDatabase();
    city1 = (await City.create({ name: "City 1" }).fetch()).id;
    city2 = (await City.create({ name: "City 2" }).fetch()).id;
  });

  function snapshot(zones: Partial<ImportedDeliveryZone>[], extra: Partial<DeliveryZoneSnapshot> = {}): DeliveryZoneSnapshot {
    return { source: "kml", fetchedAt: "2026-08-20T00:00:00Z", zones: zones as ImportedDeliveryZone[], ...extra };
  }

  /** A zone an earlier run of the source left behind. */
  const existing = (values: Record<string, unknown>) =>
    DeliveryZone.create({ source: "kml", polygon: RING, minDeliveryTime: 30, deliveryCost: 100, ...values }).fetch();

  const apply = (zones: Partial<ImportedDeliveryZone>[], extra: Partial<DeliveryZoneSnapshot> = {}, dryRun = false) =>
    DeliveryZoneImportService.apply(snapshot(zones, extra), { terms, dryRun });

  const row = async (externalId: string) => (await DeliveryZone.find({ externalId }))[0];
  const all = async () => DeliveryZone.find({});

  describe("a snapshot is checked before anything is written", function () {
    it("accepts a well-formed one", function () {
      expect(validateSnapshot(snapshot([{ externalId: "external-1", name: "Zone 1", polygon: RING }]))).to.deep.equal([]);
    });

    it("reports every problem: no external id, an unusable polygon, a duplicated id", function () {
      expect(validateSnapshot(snapshot([{ name: "Zone 1", polygon: RING }]))[0]).to.contain("no external id");
      expect(validateSnapshot(snapshot([{ externalId: "external-1", name: "Zone 1", polygon: [[0, 0]] }]))[0])
        .to.contain("unusable polygon");
      expect(validateSnapshot(snapshot([
        { externalId: "external-1", name: "Zone 1", polygon: RING },
        { externalId: "external-1", name: "Zone 2", polygon: RING },
      ]))[0]).to.contain("more than once");
      expect(validateSnapshot(snapshot([{ name: "Zone 1", polygon: RING }, { name: "Zone 2", polygon: RING }]))).to.have.length(2);
    });

    it("an invalid one leaves the existing zones untouched", async function () {
      await existing({ externalId: "external-1", name: "Zone 1" });

      const result = await apply([{ externalId: "external-1", name: "Zone 1 renamed", polygon: [[0, 0]] }]);

      expect(result.errors).to.not.be.empty;
      expect((await row("external-1")).name).to.equal("Zone 1");
    });
  });

  it("a dry run writes nothing but reports the diff", async function () {
    await existing({ externalId: "external-1", name: "Zone 1" });

    const result = await apply([
      { externalId: "external-1", name: "Zone 1 renamed", polygon: RING },
      { externalId: "external-2", name: "Zone 2", polygon: RING },
    ], {}, true);

    expect(result.stats).to.include({ updated: 1, created: 1 });
    expect(result.entries.find((entry) => entry.action === "update")?.changes).to.contain("name");
    expect((await all()).map((zone: any) => zone.name)).to.deep.equal(["Zone 1"]);
  });

  it("never overwrites what the operator owns", async function () {
    await existing({
      externalId: "external-1", name: "Zone 1",
      deliveryCost: 300, deliveryItem: "dish-1", minOrderTotal: 500, freeDeliveryFrom: 2000,
      enable: false, sortOrder: 7, worktime: [{ dayOfWeek: "monday" }],
      description: "operator wrote this", customData: { note: "keep" },
    });

    await apply([{ externalId: "external-1", name: "Zone 1 renamed", description: "from kml", polygon: RING }]);

    const zone = await row("external-1");
    expect(zone).to.include({
      deliveryCost: 300, deliveryItem: "dish-1", minOrderTotal: 500, freeDeliveryFrom: 2000,
      enable: false, sortOrder: 7, description: "operator wrote this",
    });
    expect(zone.worktime).to.deep.equal([{ dayOfWeek: "monday" }]);
    expect(zone.customData).to.deep.equal({ note: "keep" });
    // The name is the source's; the description is not, operators write terms into it.
    expect(zone.name).to.equal("Zone 1 renamed");
  });

  it("moves descriptions only when the source is allowed to own them", async function () {
    await existing({ externalId: "external-1", name: "Zone 1", description: "local" });

    await apply([{ externalId: "external-1", name: "Zone 1", description: "from kml", polygon: RING }], { updateDescriptions: true });

    expect((await row("external-1")).description).to.equal("from kml");
  });

  it("creates zones switched off and layers switched on", async function () {
    await apply([{ externalId: "external-1", name: "Zone 1", polygon: RING, layer: { externalId: "layer-1", name: "Layer 1" } }]);

    // The zone waits for someone to price it; the layer does not, because a
    // layer that is off would keep its zones off however they are switched.
    expect((await row("external-1")).enable).to.equal(false);
    expect((await row("layer-1")).enable).to.equal(true);
  });

  it("does not create a row that would price itself when the import was given no terms", async function () {
    const result = await DeliveryZoneImportService.apply(snapshot([{ externalId: "external-1", name: "Zone 1", polygon: RING }]));

    expect(result.stats).to.include({ created: 0, failed: 1 });
    expect(await all()).to.deep.equal([]);
  });

  it("changes nothing on a repeated snapshot", async function () {
    const same = [{ externalId: "external-1", name: "Zone 1", polygon: RING }];
    await apply(same);
    const first = await row("external-1");

    const result = await apply(same);

    expect(result.stats).to.include({ unchanged: 1, updated: 0 });
    expect((await row("external-1")).updatedAt).to.equal(first.updatedAt);
  });

  it("marks a zone the source no longer lists instead of deleting it, and clears the mark when it comes back", async function () {
    await existing({ externalId: "external-1", name: "Zone 1", sourceHash: sourceHashOf({ externalId: "external-1", name: "Zone 1", polygon: RING }) });
    await existing({ externalId: "external-2", name: "Zone 2", deliveryCost: 900 });

    const result = await apply([{ externalId: "external-1", name: "Zone 1", polygon: RING }]);

    expect(result.stats.missing).to.equal(1);
    expect(await all()).to.have.length(2);
    expect((await row("external-2")).missingFromSourceAt).to.be.a("number");
    expect((await row("external-2")).deliveryCost).to.equal(900);

    await apply([{ externalId: "external-1", name: "Zone 1", polygon: RING }, { externalId: "external-2", name: "Zone 2", polygon: RING }]);
    expect((await row("external-2")).missingFromSourceAt).to.equal(null);
  });

  it("ignores zones of another source", async function () {
    await existing({ source: "other", externalId: "external-1", name: "Zone 9" });

    const result = await apply([{ externalId: "external-1", name: "Zone 1", polygon: RING }]);

    expect(result.stats.missing).to.equal(0);
    expect((await DeliveryZone.find({ source: "other" }))[0].name).to.equal("Zone 9");
  });

  describe("cities", function () {
    it("does not declare another city's zones missing", async function () {
      // One map per city: the first city to sync must not decide that every
      // other city has lost all its zones.
      await existing({ city: city1, externalId: "external-1", name: "Zone 1" });
      await existing({ city: city2, externalId: "external-1", name: "Zone 1" });

      const result = await apply([{ externalId: "external-1", name: "Zone 1", polygon: RING }], { city: city1 });

      expect(result.stats.missing).to.equal(0);
      expect((await DeliveryZone.find({ city: city2 }))[0].missingFromSourceAt).to.not.be.a("number");
    });

    it("treats the same external id in two cities as two zones", async function () {
      await existing({ city: city1, externalId: "external-1", name: "Zone 1 of City 1" });

      const result = await apply([{ externalId: "external-1", name: "Zone 1 of City 2", polygon: RING }], { city: city2 });

      expect(result.stats).to.include({ created: 1, updated: 0 });
      expect((await all()).map((zone: any) => zone.name)).to.have.members(["Zone 1 of City 1", "Zone 1 of City 2"]);
    });

    it("keeps a single-city installation working with no city at all", async function () {
      await existing({ externalId: "external-1", name: "Zone 1" });

      const result = await apply([{ externalId: "external-1", name: "Zone 1 renamed", polygon: RING }]);

      expect(result.stats.updated).to.equal(1);
      expect(result.city).to.equal(null);
      expect(await all()).to.have.length(1);
    });
  });

  describe("layers", function () {
    const layer1 = { externalId: "layer-1", name: "Layer 1" };

    it("creates a layer row without geometry and points its zones at it", async function () {
      const result = await apply([
        { externalId: "external-1", name: "Zone 1", polygon: RING, layer: layer1 },
        { externalId: "external-2", name: "Zone 2", polygon: RING, layer: layer1 },
      ]);

      expect(result.stats.created).to.equal(3);
      const layer = await row("layer-1");
      expect(layer.polygon ?? []).to.deep.equal([]);
      expect([(await row("external-1")).parent, (await row("external-2")).parent]).to.deep.equal([layer.id, layer.id]);
    });

    it("leaves a zone with no layer unparented", async function () {
      await apply([{ externalId: "external-1", name: "Zone 1", polygon: RING }]);
      expect((await row("external-1")).parent).to.equal(null);
    });

    it("reuses the layer row on the next run, and does not report it missing", async function () {
      const zones = [{ externalId: "external-1", name: "Zone 1", polygon: RING, layer: layer1 }];
      await apply(zones);
      const layerId = (await row("layer-1")).id;

      const again = await apply(zones);

      expect(await all()).to.have.length(2);
      expect(again.stats).to.include({ created: 0, missing: 0 });
      expect((await row("external-1")).parent).to.equal(layerId);
    });

    it("moves a zone when the source moves it between folders", async function () {
      await apply([{ externalId: "external-1", name: "Zone 1", polygon: RING, layer: layer1 }]);
      await apply([{ externalId: "external-1", name: "Zone 1", polygon: RING, layer: { externalId: "layer-2", name: "Layer 2" } }]);

      expect((await row("external-1")).parent).to.equal((await row("layer-2")).id);
    });
  });

  describe("terms of new rows", function () {
    it("go to a new layer and a new loose zone, not to a zone its new layer prices", async function () {
      await apply([
        { externalId: "external-1", name: "Zone 1", polygon: RING, layer: { externalId: "layer-1", name: "Layer 1" } },
        { externalId: "external-2", name: "Zone 2", polygon: RING },
      ]);

      expect(await row("layer-1")).to.include(terms);
      expect(await row("external-2")).to.include(terms);
      expect(await row("external-1")).to.include({ minDeliveryTime: null, deliveryCost: null });
    });

    it("go to a new zone in an existing layer that only groups", async function () {
      await existing({ externalId: "layer-1", name: "Layer 1", polygon: [], termsApplyToZones: false });

      await apply([{ externalId: "external-1", name: "Zone 1", polygon: RING, layer: { externalId: "layer-1", name: "Layer 1" } }]);

      expect(await row("external-1")).to.include(terms);
      expect(await row("layer-1")).to.include({ minDeliveryTime: 30, deliveryCost: 100 });
    });

    it("never rewrite the terms of a row that already exists", async function () {
      await existing({ externalId: "external-1", name: "Zone 1" });

      await apply([{ externalId: "external-1", name: "Zone 1 renamed", polygon: RING }]);

      expect(await row("external-1")).to.include({ name: "Zone 1 renamed", minDeliveryTime: 30, deliveryCost: 100 });
    });
  });

  describe("zones out of a file", function () {
    const byName = async () => (await DeliveryZone.find({}).sort("sortOrder ASC")).map((zone: any) => zone.name);

    it("are created switched on, in the file's order, owned by nobody, with the terms stated with the file", async function () {
      const result = await importLocalZones({ city: city1, zones: [{ name: "Zone 1", polygon: RING }, { name: "Zone 2", polygon: RING }], terms });

      expect(result).to.deep.equal({ created: 2, skipped: [] });
      expect(await byName()).to.deep.equal(["Zone 1", "Zone 2"]);
      for (const zone of await all()) {
        expect(zone).to.include({ enable: true, city: city1, ...terms });
        expect(zone.source ?? null).to.equal(null);
        expect(zone.externalId ?? null).to.equal(null);
      }
    });

    it("skip a shape that cannot enclose an area, and name it", async function () {
      const result = await importLocalZones({
        city: null,
        zones: [{ name: "Line 1", polygon: [[9, 9], [11, 9], [9, 9]] }, { name: "Zone 1", polygon: RING }],
        terms,
      });

      expect(result).to.deep.equal({ created: 1, skipped: ["Line 1"] });
      expect(await byName()).to.deep.equal(["Zone 1"]);
    });

    it("are made again when the same file is loaded twice", async function () {
      await importLocalZones({ city: city1, zones: [{ name: "Zone 1", polygon: RING }], terms });
      await importLocalZones({ city: city1, zones: [{ name: "Zone 1", polygon: RING }], terms });

      expect(await byName()).to.deep.equal(["Zone 1", "Zone 1"]);
    });
  });
});
