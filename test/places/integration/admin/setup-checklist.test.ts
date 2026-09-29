import { expect } from "chai";
import { SetupChecklistRegistry } from "../../../../lib/SetupChecklistRegistry";
import { SetupChecklistService } from "../../../../lib/SetupChecklistService";
import { resetDatabase } from "../../support/reset";

/**
 * The setup checklist the admin shows: what a fresh installation still lacks
 * before it can take orders. Every item is checked live against the settings
 * and the rows, both ways; a checkup that breaks is shown as an error and breaks
 * nothing else; recommended items can be dismissed, required ones cannot.
 */
describe("Setup checklist", function () {
  const ctx = { locale: "en", t: (key: string, params?: any) => key.replace("{count}", String(params?.count)).replace("{total}", String(params?.total)), now: new Date() } as any;
  const SETTINGS = {
    PROJECT_NAME: "project-1",
    COUNTRY_ISO: "US",
    DEFAULT_CURRENCY_ISO: "USD",
    DEFAULT_LOCALE: "en",
    FRONTEND_CHECKOUT_PAGE: "/checkout",
    FRONTEND_ORDER_PAGE: "/order",
  };

  before(function () {
    SetupChecklistRegistry.registerCheckup({
      key: "checkup_partial", group: "project", severity: "recommended", titleKey: "Checkup 1",
      check: async () => ({ progress: { done: 1, total: 3 } }),
    });
    SetupChecklistRegistry.registerCheckup({
      key: "checkup_broken", group: "project", severity: "optional", titleKey: "Checkup 2",
      check: async () => {
        throw new Error("Error 1");
      },
    });
  });

  beforeEach(async function () {
    await resetDatabase();
  });

  const status = () => SetupChecklistService.getStatus(ctx);
  const item = async (key: string) => (await status()).groups.flatMap((group: any) => group.items).find((candidate: any) => candidate.key === key);

  /** Everything required, filled in. */
  async function readyInstallation(): Promise<void> {
    for (const [key, value] of Object.entries(SETTINGS)) await Settings.set(key as any, { value } as any);
    await PaymentMethod.create({ title: "Payment 1", type: "promise", adapter: "payment-1", enable: true }).fetch();
    await DeliveryZone.create({ name: "Zone 1", polygon: [[9, 9], [11, 9], [11, 11], [9, 11], [9, 9]], deliveryCost: 100, minDeliveryTime: 30 }).fetch();
    await SalesChannel.create({ name: "Channel 1", type: "website", enabled: true } as any).fetch();
  }

  it("a fresh installation is not ready: nothing required is done", async function () {
    const current = await status();
    expect(current.overallReady).to.equal(false);
    expect(current.counts.required.done).to.equal(0);
    expect((await item("project_name")).status).to.equal("todo");
  });

  it("filled in, it is ready — and emptying a setting again takes that back", async function () {
    await readyInstallation();

    let current = await status();
    expect(current.counts.required.done).to.equal(current.counts.required.total);
    expect(current.overallReady).to.equal(true);
    expect(await item("project_name")).to.include({ status: "done", detail: "project-1" });

    await Settings.set("FRONTEND_ORDER_PAGE", { value: "" });
    current = await status();
    expect((await item("project_order_page")).status).to.equal("todo");
    expect(current.overallReady).to.equal(false);
  });

  it("a delivery zone counts only once its delivery time and cost are set", async function () {
    expect((await item("has_delivery_zone")).status).to.equal("todo");

    await DeliveryZone.create({ name: "Layer 1", polygon: [], deliveryCost: 100, minDeliveryTime: 30 }).fetch();
    expect((await item("has_delivery_zone")).status).to.equal("todo");

    await DeliveryZone.create({ name: "Zone 1", polygon: [[9, 9], [11, 9], [11, 11], [9, 11], [9, 9]], deliveryCost: 100, minDeliveryTime: 30 }).fetch();
    expect(await item("has_delivery_zone")).to.include({ status: "done", detail: "Zones that deliver: 1" });
    const target = SetupChecklistRegistry.getCheckup("has_delivery_zone")!.target;
    expect((typeof target === "function" ? target(ctx) : target)!.url).to.equal("/delivery-zones-manager");
  });

  it("a place created and not enabled is still to do, and says why", async function () {
    const place = await Place.create({ title: "Kitchen 1", enable: false }).fetch();
    expect((await item("has_place")).status).to.equal("todo");
    expect((await item("has_place")).detail).to.contain("none enabled");

    await Place.update({ id: place.id }, { enable: true }).fetch();
    expect((await item("has_place")).status).to.equal("done");
  });

  it("a checkup in progress shows its progress; one that breaks is an error and breaks nothing", async function () {
    expect(await item("checkup_partial")).to.deep.include({ status: "in_progress", progress: { done: 1, total: 3 } });
    expect((await item("checkup_broken")).status).to.equal("error");
    expect((await status()).counts.errors).to.be.greaterThan(0);
  });

  it("links a setting's item to that field of the settings page", function () {
    const target = SetupChecklistRegistry.getCheckup("project_name")!.target;
    expect((typeof target === "function" ? target(ctx) : target)!.url).to.equal("/settings-manager#PROJECT_NAME");
  });

  it("dismisses a recommended item and restores it; a required one cannot be dismissed", async function () {
    expect(await SetupChecklistService.dismiss("project_name")).to.equal(false);
    expect(await SetupChecklistService.dismiss("has_place")).to.equal(true);
    expect(await item("has_place")).to.include({ dismissed: true, status: "skipped" });

    await SetupChecklistService.restore("has_place");
    expect((await item("has_place")).dismissed).to.equal(false);
  });
});
