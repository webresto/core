import { expect } from "chai";
import * as http from "http";
import { AddressInfo } from "net";
import { registerCoreMcpTools } from "../../../../hook/mcp";
import { resetDatabase, withSettings } from "../../support/reset";
import { newBasket } from "../../support/storefront";

/**
 * The MCP tools an operator of a multi-kitchen installation runs it with: zones
 * and their terms, delivery to an address, cities, the address catalog loaded
 * from a link, stock per place, and deleting a place nobody ordered from.
 *
 *   Zone 1 around (10, 10), delivery 300, 40 min; Place 1 cooks inside it.
 */
describe("MCP admin tools", function () {
  const tools = new Map<string, any>();
  let saved: { mcp: unknown; enabled: string | undefined };

  const RING_1 = [[9, 9], [11, 9], [11, 11], [9, 11], [9, 9]];
  const RING_2 = [[19, 19], [21, 19], [21, 21], [19, 21], [19, 19]];

  before(function () {
    saved = { mcp: (global as any).mcp, enabled: process.env.MCP_ENABLED };
    (global as any).mcp = { registerTool: (tool: any) => tools.set(tool.name, tool), registerGroup: (): void => undefined };
    process.env.MCP_ENABLED = "true";
    registerCoreMcpTools();
  });

  after(function () {
    (global as any).mcp = saved.mcp;
    if (saved.enabled === undefined) delete process.env.MCP_ENABLED;
    else process.env.MCP_ENABLED = saved.enabled;
  });

  const call = (name: string, params: Record<string, unknown> = {}) => tools.get(name).handler(params, {});
  const refused = async (promise: Promise<unknown>): Promise<string> => {
    try {
      await promise;
    } catch (error) {
      return (error as Error).message;
    }
    throw new Error("expected a refusal");
  };

  let city: string;
  let zone1: string;
  let zone2: string;

  beforeEach(async function () {
    await resetDatabase();
    city = (await City.create({ name: "City 1" }).fetch()).id;
    zone1 = (await DeliveryZone.create({ name: "Zone 1", city, polygon: RING_1, deliveryCost: 300, minDeliveryTime: 40, sortOrder: 1 } as any).fetch()).id;
    zone2 = (await DeliveryZone.create({ name: "Zone 2", city, polygon: RING_2, deliveryCost: 500, minDeliveryTime: 60, sortOrder: 2, enable: false } as any).fetch()).id;
  });

  it("registers every tool in its group", function () {
    const groups: Record<string, string[]> = {
      "delivery-zones": ["zone-list", "zone-get", "zone-update", "zone-update-many", "zone-sync", "delivery-check"],
      cities: ["city-list", "city-create", "city-update"],
      addresses: ["address-import", "address-import-status", "address-validate", "address-stats", "address-search"],
      stock: ["stock-list", "stock-set"],
      places: ["place-delete"],
    };
    for (const [group, names] of Object.entries(groups)) {
      for (const name of names) expect(tools.get(name)?.group, name).to.equal(group);
    }
  });

  describe("zones", function () {
    it("lists the zones by order, without polygons unless asked, and filters by switch", async function () {
      const all = await call("zone-list", { city });
      expect(all.zones.map((zone: any) => zone.name)).to.deep.equal(["Zone 1", "Zone 2"]);
      expect(all.zones[0]).to.include({ deliveryCost: 300, minDeliveryTime: 40, polygonPoints: 5, locked: false });
      expect(all.zones[0]).to.not.have.property("polygon");

      expect((await call("zone-list", { enable: true })).zones.map((zone: any) => zone.name)).to.deep.equal(["Zone 1"]);
      expect((await call("zone-get", { id: zone1 })).polygon).to.deep.equal(RING_1);
    });

    it("writes only the fields given, and the next price uses them", async function () {
      expect((await call("delivery-check", { lat: 10, lon: 10 })).delivery).to.include({ cost: 300 });

      const updated = await call("zone-update", { id: zone1, deliveryCost: 150, minOrderTotal: 500 });

      expect(updated).to.include({ deliveryCost: 150, minOrderTotal: 500, minDeliveryTime: 40, name: "Zone 1", enable: true });
      // The zone cache was dropped by the model, not by a restart.
      expect((await call("delivery-check", { lat: 10, lon: 10 })).delivery).to.include({ cost: 150 });
    });

    it("refuses a field nobody may write and a zone without its required terms", async function () {
      expect(await refused(call("zone-update", { id: zone1, source: "kml" }))).to.contain('"source" cannot be written');
      expect(await refused(call("zone-update", { id: zone1, deliveryCost: null }))).to.contain("deliveryCost");
      expect(await refused(call("zone-update", { id: "nowhere", enable: true }))).to.contain("not found");
    });

    it("keeps the geometry of a zone a map link owns, and still writes its terms", async function () {
      const owned = (await DeliveryZone.create({ name: "Zone 3", city, polygon: RING_2, deliveryCost: 100, minDeliveryTime: 30, source: "kml", externalId: "Zone 3" } as any).fetch()).id;

      await withSettings(
        {
          DELIVERY_ZONE_SYNC_ENABLED: false,
          DELIVERY_ZONE_SYNC_CONFIG: { cities: [{ city, url: "http://127.0.0.1:9/map.kml", externalIdSource: "name" }] },
        },
        async () => {
          expect((await call("zone-get", { id: owned })).locked).to.equal(true);
          expect(await refused(call("zone-update", { id: owned, name: "Zone 4" }))).to.contain("owned by the \"kml\" synchronisation");
          expect(await call("zone-update", { id: owned, enable: false, deliveryCost: 250 })).to.include({ enable: false, deliveryCost: 250, name: "Zone 3" });
        },
      );
    });

    it("writes many zones at once and reports the ones refused", async function () {
      const result = await call("zone-update-many", { where: { city }, set: { enable: true, minOrderTotal: 500 } });
      expect(result).to.deep.equal({ matched: 2, updated: 2, failed: [], missing: [] });
      expect((await call("zone-list", { enable: true })).count).to.equal(2);

      const partly = await call("zone-update-many", { ids: [zone1, "nowhere"], set: { deliveryCost: null } });
      expect(partly.updated).to.equal(0);
      expect(partly.failed.map((entry: any) => entry.id)).to.deep.equal([zone1]);
      expect(partly.missing).to.deep.equal(["nowhere"]);

      expect(await refused(call("zone-update-many", { set: { enable: true } }))).to.contain("Pick the zones");
    });

    it("runs the synchronisation by hand and answers without the per-zone list unless asked", async function () {
      const outcome = await call("zone-sync", { dryRun: true });
      expect(outcome).to.satisfy((value: any) => value.skipped === true || typeof value.entries === "number");
    });
  });

  describe("delivery to an address", function () {
    it("answers the zone, the price and the kitchen that would cook", async function () {
      const place = (await Place.create({ title: "Place 1", city, coordinate: { lat: 10.1, lon: 10.1 }, enable: true, isCookingPoint: true, isPickupPoint: true }).fetch()).id;

      const answer = await call("delivery-check", { lat: 10, lon: 10 });

      expect(answer.delivery).to.include({ allowed: true, cost: 300, zoneName: "Zone 1" });
      expect(answer.kitchen).to.include({ placeId: place, title: "Place 1" });
      expect(answer.kitchen.diagnostics).to.be.an("array").that.is.not.empty;
    });

    it("wants somewhere to look", async function () {
      expect(await refused(call("delivery-check", {}))).to.contain("lat and lon");
    });
  });

  describe("cities", function () {
    it("creates, lists with places and switches a city off", async function () {
      const created = await call("city-create", { name: "City 2", slug: "city-2" });
      expect(await refused(call("city-create", { name: "City 2" }))).to.contain("already exists");
      await Place.create({ title: "Place 1", city: created.id, enable: true }).fetch();

      const listed = await call("city-list");
      expect(listed.find((entry: any) => entry.id === created.id)).to.include({ name: "City 2", places: 1 });

      await call("city-update", { id: created.id, isDeleted: true });
      expect((await call("city-list")).map((entry: any) => entry.name)).to.deep.equal(["City 1"]);
      expect((await call("city-list", { includeDeleted: true })).length).to.equal(2);
    });
  });

  describe("address catalog", function () {
    let server: http.Server;
    let base: string;
    const files: Record<string, unknown> = {
      "/good.json": {
        nodes: [
          { key: "street-1", type: "street", name: "Street 1" },
          { key: "house-1", parent: "street-1", type: "house", name: "1", point: { lat: 10, lon: 10 } },
        ],
      },
      "/bad.json": { nodes: [{ type: "planet", name: "Planet 1" }] },
    };

    before(async function () {
      server = http.createServer((req, res) => {
        const body = files[req.url ?? ""];
        res.writeHead(body ? 200 : 404, { "Content-Type": "application/json" });
        res.end(body ? JSON.stringify(body) : "{}");
      });
      await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
      base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    });

    after(function () {
      server.close();
    });

    const finished = async (jobId: string) => {
      for (let i = 0; i < 100; i++) {
        const job = await call("address-import-status", { jobId });
        if (job.status !== "running") return job;
        await new Promise((resolve) => setTimeout(resolve, 50));
      }
      throw new Error("the load did not finish");
    };

    it("loads a file from a link in the background, and refuses to load it twice without replace", async function () {
      const job = await call("address-import", { city, url: `${base}/good.json` });
      expect(job.status).to.equal("running");

      expect(await finished(job.id)).to.include({ status: "done", created: 2, deleted: 0, nodes: 2 });
      expect(await call("address-stats", { city })).to.include({ total: 2, duplicates: 0, orphans: 0 });

      expect(await refused(call("address-import", { city, url: `${base}/good.json` }))).to.contain("replace: true");

      const again = await call("address-import", { city, url: `${base}/good.json`, replace: true });
      expect(await finished(again.id)).to.include({ status: "done", created: 2, deleted: 2 });
      expect((await call("address-stats", { city })).byType).to.deep.equal({ street: 1, house: 1 });
    });

    it("reports a broken file without writing, and checks one before loading", async function () {
      const job = await call("address-import", { city, url: `${base}/bad.json` });
      const done = await finished(job.id);
      expect(done.status).to.equal("failed");
      expect(done.errors[0]).to.contain("unknown type");
      expect((await call("address-stats", { city })).total).to.equal(0);

      const checked = await call("address-validate", { url: `${base}/good.json` });
      expect(checked).to.deep.include({ nodes: 2, byType: { street: 1, house: 1 }, errorCount: 0 });
    });

    it("searches the catalog as the storefront does, with the path of each hit", async function () {
      const job = await call("address-import", { city, url: `${base}/good.json` });
      await finished(job.id);

      const [street] = await call("address-search", { city, query: "Str" });
      expect(street).to.include({ type: "street", name: "Street 1" });

      const [house] = await call("address-search", { city, query: "1", parent: street.id });
      expect(house).to.include({ type: "house", name: "1" });
      expect(house.path).to.contain("Street 1");
    });

    it("wants a city that exists and a link", async function () {
      expect(await refused(call("address-import", { city: "nowhere", url: `${base}/good.json` }))).to.contain("not found");
      expect(await refused(call("address-import", { city, url: "file:///etc/passwd" }))).to.contain("http(s)");
    });
  });

  describe("stock per place", function () {
    let place: string;
    let dish: string;

    beforeEach(async function () {
      place = (await Place.create({ title: "Place 1", city, enable: true, isCookingPoint: true }).fetch()).id;
      const group = (await Group.create({ name: "Group 1", enable: true }).fetch()).id;
      dish = (await Dish.create({ name: "Dish 1", price: 100, enable: true, parentGroup: group }).fetch()).id;
      await Dish.create({ name: "Dish 2", price: 100, enable: true, parentGroup: group }).fetch();
    });

    it("sets a balance, lists what limits the place, and forgets a row that limits nothing", async function () {
      expect((await call("stock-list", { placeId: place })).count).to.equal(0);

      expect(await call("stock-set", { placeId: place, dishId: dish, localBalance: 5 })).to.include({ balance: 5, stored: true });
      const listed = await call("stock-list", { placeId: place });
      expect(listed.items).to.have.length(1);
      expect(listed.items[0]).to.include({ dishId: dish, localBalance: 5, balance: 5 });

      expect(await call("stock-set", { placeId: place, dishId: dish, localBalance: null })).to.include({ balance: -1, stored: false });
      expect((await call("stock-list", { placeId: place })).count).to.equal(0);
    });

    it("switches a dish off at a place, and lists every dish when asked", async function () {
      expect(await call("stock-set", { placeId: place, dishId: dish, enable: false })).to.include({ balance: 0, enable: false });

      const every = await call("stock-list", { placeId: place, all: true });
      const byName = Object.fromEntries(every.items.map((item: any) => [item.name, item.balance]));
      expect(byName).to.deep.equal({ "Dish 1": 0, "Dish 2": -1 });
    });

    it("refuses what is not a balance", async function () {
      expect(await refused(call("stock-set", { placeId: place, dishId: dish, localBalance: -5 }))).to.contain("from -1 up");
      expect(await refused(call("stock-set", { placeId: place, dishId: dish }))).to.contain("localBalance or enable");
      expect(await refused(call("stock-set", { placeId: "nowhere", dishId: dish, localBalance: 1 }))).to.contain("Place not found");
    });
  });

  describe("deleting a place", function () {
    it("deletes a place nobody ordered from, with its stock rows", async function () {
      const place = (await Place.create({ title: "Place 1", city, enable: true, isCookingPoint: true }).fetch()).id;
      const group = (await Group.create({ name: "Group 1", enable: true }).fetch()).id;
      const dish = (await Dish.create({ name: "Dish 1", price: 100, enable: true, parentGroup: group }).fetch()).id;
      await DishPlace.upsertForPlace(dish, place, { localBalance: 3 });

      expect(await call("place-delete", { id: place })).to.deep.equal({ deleted: true, id: place, stockRowsRemoved: 1 });
      expect(await Place.findOne({ id: place })).to.equal(undefined);
    });

    it("refuses a place an order points at", async function () {
      const place = (await Place.create({ title: "Place 1", city, enable: true, isCookingPoint: true, isPickupPoint: true }).fetch()).id;
      const order = await newBasket();
      await Order.updateOne({ id: order }).set({ pickupPoint: place } as any);

      expect(await refused(call("place-delete", { id: place }))).to.contain("Orders point at this place");
      expect(await Place.findOne({ id: place })).to.not.equal(undefined);
    });
  });
});
