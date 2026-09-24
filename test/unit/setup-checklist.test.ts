/**
 * Unit tests for the setup checklist (registry + live service).
 *
 * Standalone: mocks the globals the check() handlers touch (Settings, PaymentMethod, Place,
 * Adapter, sails) — does NOT lift Sails, so it runs without a database:
 *
 *   npx mocha -r ts-node/register/transpile-only test/unit/setup-checklist.test.ts --exit
 *
 * Focus: a checkup must REACT live — once the matching setting is filled it flips to "done"
 * and stops showing as not-done (no caching of results).
 */

import { expect } from "chai";
import { SetupChecklistRegistry } from "../../lib/SetupChecklistRegistry";
import { SetupChecklistService } from "../../lib/SetupChecklistService";
import { invalidateDeliveryZoneCache } from "../../adapters/delivery/default/zone-cache";

// ── global mocks ──────────────────────────────────────────────────────────────
const store: Record<string, any> = {};
let paymentTotal = 0, paymentEnabled = 0;
let placeTotal = 0, placeEnabled = 0;
let rms: any = null;
// What `DeliveryZone.findServing` answers: zones that can take an order, with
// their layer's terms already applied.
let servingZones: any[] = [];
const setServingZones = (zones: any[]) => { servingZones = zones; invalidateDeliveryZoneCache(); };

// count(criteria?) — criteria { enable: true } returns the enabled subset, else the total.
const counter = (total: () => number, enabled: () => number) =>
  async (where?: any) => (where && where.enable === true ? enabled() : total());

(global as any).sails = { log: { warn() {}, error() {}, info() {}, debug() {} } };
(global as any).Settings = {
  async get(k: string) { return store[k]; },
  async set(k: string, v: any) { store[k] = v?.value ?? v; return v; },
  setDeclaredSetting() {},
};
(global as any).PaymentMethod = { count: counter(() => paymentTotal, () => paymentEnabled) };
(global as any).Place = { count: counter(() => placeTotal, () => placeEnabled) };
(global as any).Adapter = { async getRMSAdapter() { return rms; } };
(global as any).DeliveryZone = { async findServing() { return servingZones; } };

const ctx = { locale: "en", t: (k: string) => k, now: new Date() };
const findItem = (st: any, key: string) =>
  st.groups.flatMap((g: any) => g.items).find((i: any) => i.key === key);

describe("SetupChecklist registry + service", () => {
  before(() => {
    SetupChecklistRegistry.registerCoreDefaults();
    SetupChecklistRegistry.registerCheckup({
      key: "partial_demo", group: "project", severity: "recommended", titleKey: "Partial demo",
      check: async () => ({ progress: { done: 1, total: 3 } }),
    });
    SetupChecklistRegistry.registerCheckup({
      key: "throwing_demo", group: "project", severity: "optional", titleKey: "Throwing",
      check: async () => { throw new Error("intentional"); },
    });
  });

  it("registers core defaults", () => {
    expect(SetupChecklistRegistry.getCheckup("project_name")).to.not.equal(null);
    expect(SetupChecklistRegistry.getCheckup("project_currency")!.severity).to.equal("required");
  });

  it("empty config → required items are 'todo' and overallReady is false", async () => {
    Object.keys(store).forEach((k) => delete store[k]);
    paymentTotal = 0; paymentEnabled = 0; placeTotal = 0; placeEnabled = 0; rms = null;
    setServingZones([]);

    const st = await SetupChecklistService.getStatus(ctx);
    expect(st.overallReady).to.equal(false);
    expect(findItem(st, "project_name").status).to.equal("todo");
    expect(st.counts.required.done).to.equal(0);
    expect(st.progressPercent).to.equal(0);
  });

  it("a throwing/invalid check is isolated as 'error' and never breaks the run", async () => {
    const st = await SetupChecklistService.getStatus(ctx);
    expect(findItem(st, "throwing_demo").status).to.equal("error");
    expect(st.counts.errors).to.be.greaterThan(0);
  });

  it("partial progress → 'in_progress' with progress payload", async () => {
    const st = await SetupChecklistService.getStatus(ctx);
    const item = findItem(st, "partial_demo");
    expect(item.status).to.equal("in_progress");
    expect(item.progress).to.deep.equal({ done: 1, total: 3 });
  });

  it("REACTS: filling a setting flips its checkup to 'done' (no caching)", async () => {
    // before: not filled
    let st = await SetupChecklistService.getStatus(ctx);
    expect(findItem(st, "project_name").status).to.equal("todo");

    // operator fills the setting (as update-setting → Settings.set would)
    store["PROJECT_NAME"] = "My Resto";
    st = await SetupChecklistService.getStatus(ctx);
    expect(findItem(st, "project_name").status).to.equal("done");
    // the current value is surfaced as `detail` for display on the page
    expect(findItem(st, "project_name").detail).to.equal("My Resto");

    // fill the rest of the required settings + enable a payment method
    store["COUNTRY_ISO"] = "RU";
    store["DEFAULT_CURRENCY_ISO"] = "RUB";
    store["DEFAULT_LOCALE"] = "ru";
    store["FRONTEND_CHECKOUT_PAGE"] = "/checkout";
    store["FRONTEND_ORDER_PAGE"] = "/order";
    paymentTotal = 1; paymentEnabled = 1;
    setServingZones([{ id: "z1", minDeliveryTime: 40, deliveryCost: 200 }]);

    st = await SetupChecklistService.getStatus(ctx);
    expect(st.counts.required.done).to.equal(st.counts.required.total);
    expect(st.overallReady).to.equal(true);
  });

  it("delivery zones: required, and only a zone whose terms are set counts", async () => {
    expect(SetupChecklistRegistry.getCheckup("has_delivery_zone")!.severity).to.equal("required");

    // No zone at all: delivery is refused, so the installation is not ready.
    setServingZones([]);
    let st = await SetupChecklistService.getStatus(ctx);
    let zones = findItem(st, "has_delivery_zone");
    expect(zones.status).to.equal("todo");
    expect(st.overallReady).to.equal(false);

    // A zone that can take orders but states no time or cost — its own or its
    // layer's — prices nothing.
    setServingZones([{ id: "z1", minDeliveryTime: null, deliveryCost: 200 }]);
    st = await SetupChecklistService.getStatus(ctx);
    expect(findItem(st, "has_delivery_zone").status).to.equal("todo");

    // Terms set on the zone or lent by its layer look the same here: that is
    // resolved by `findServing` before this reads them.
    setServingZones([
      { id: "z1", minDeliveryTime: 40, deliveryCost: 200 },
      { id: "z2", minDeliveryTime: 60, deliveryCost: 0 },
    ]);
    // A `t` that fills the placeholders, to see the count reach the hint.
    const counted = { ...ctx, t: (k: string, p?: any) => k.replace("{count}", String(p?.count)) };
    st = await SetupChecklistService.getStatus(counted);
    zones = findItem(st, "has_delivery_zone");
    expect(zones.status).to.equal("done");
    expect(zones.detail).to.equal("Zones that deliver: 2");
    expect(st.overallReady).to.equal(true);

    const target = SetupChecklistRegistry.getCheckup("has_delivery_zone")!.target;
    expect((typeof target === "function" ? target(ctx) : target)!.url).to.equal("/delivery-zones-manager");
  });

  it("created-but-not-enabled → still 'todo' with an explanatory hint", async () => {
    // a place exists but none is enabled → not ready yet
    placeTotal = 1; placeEnabled = 0;
    let st = await SetupChecklistService.getStatus(ctx);
    let place = findItem(st, "has_place");
    expect(place.status).to.equal("todo");
    expect(place.detail).to.contain("none enabled");

    // enabling it flips to done with a "x of y enabled" hint
    placeEnabled = 1;
    st = await SetupChecklistService.getStatus(ctx);
    place = findItem(st, "has_place");
    expect(place.status).to.equal("done");
    expect(place.detail).to.contain("enabled");
  });

  it("emptying a setting again flips it back to 'todo' (live, both directions)", async () => {
    store["PROJECT_NAME"] = "";
    const st = await SetupChecklistService.getStatus(ctx);
    expect(findItem(st, "project_name").status).to.equal("todo");
    expect(st.overallReady).to.equal(false);
    store["PROJECT_NAME"] = "My Resto"; // restore for following tests
  });

  it("settings targets deep-link via #KEY hash (so settings-manager selects the field)", () => {
    const def = SetupChecklistRegistry.getCheckup("project_name")!;
    const target = typeof def.target === "function" ? def.target(ctx) : def.target;
    expect(target!.url).to.equal("/settings-manager#PROJECT_NAME");
  });

  it("required items cannot be dismissed; recommended can be dismissed and restored", async () => {
    expect(await SetupChecklistService.dismiss("project_name")).to.equal(false); // required
    expect(await SetupChecklistService.dismiss("has_place")).to.equal(true);     // recommended

    let st = await SetupChecklistService.getStatus(ctx);
    const place = findItem(st, "has_place");
    expect(place.dismissed).to.equal(true);
    expect(place.status).to.equal("skipped");

    await SetupChecklistService.restore("has_place");
    st = await SetupChecklistService.getStatus(ctx);
    expect(findItem(st, "has_place").dismissed).to.equal(false);
  });
});
