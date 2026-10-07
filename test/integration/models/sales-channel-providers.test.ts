import { expect } from "chai";
import SalesChannelAdapter from "../../../adapters/sales-channel/SalesChannelAdapter";
import type { SalesChannelStatusResult } from "../../../adapters/sales-channel/SalesChannelAdapter";
import { SalesChannelRegistry } from "../../../libs/SalesChannelRegistry";
import { checkCanCreate, checkCanDelete, checkCanEnable, checkPlatforms, describeChannelProvider } from "../../../libs/SalesChannelProviders";

/**
 * Sales channels come from provider modules (SalesChannel.alive): creation/adoption of the
 * provider's channel, status from the adapter, one provider per type, uninstall cleanup and
 * the rules shared by the admin API and MCP. Each test uses its own channel type, because
 * live adapters stay in memory for the whole run.
 */

class TestChannel extends SalesChannelAdapter {
  public status: SalesChannelStatusResult = { status: "needs_setup", message: "Not built" };
  public deleted: string[] = [];
  public fail: Error | null = null;

  constructor(type: string, providerModule: string, options: { platforms?: string[]; key?: string; single?: boolean } = {}) {
    super({
      type: {
        type,
        title: `Test ${type}`,
        category: "custom",
        providerModule,
        marketplaceAppId: providerModule,
        settingsUrl: `/admin/${providerModule}/setup`,
        supportsMultipleInstances: options.single ? false : true,
      },
      defaults: { key: options.key || type, title: `Test ${type}`, platforms: options.platforms || [] },
    });
  }

  async getStatus(): Promise<SalesChannelStatusResult> {
    if (this.fail) throw this.fail;
    return this.status;
  }

  async onChannelDeleted(channel: any): Promise<void> {
    this.deleted.push(channel.key);
  }
}

async function channelsOf(type: string) {
  return await SalesChannel.find({ type });
}

describe("SalesChannel providers", function () {
  this.timeout(10000);

  before(async () => {
    await SalesChannel.destroy({}).fetch();
  });

  after(async () => {
    await SalesChannel.destroy({}).fetch();
  });

  it("alive() creates the provider channel once: disabled, needs_setup, defaults applied", async () => {
    const adapter = new TestChannel("t-create", "mod-create", { platforms: ["t-create-web"] });
    await SalesChannel.alive(adapter);
    let rows = await channelsOf("t-create");
    expect(rows).to.have.length(1);
    expect(rows[0]).to.include({ key: "t-create", managedBy: "provider", providerModule: "mod-create", enabled: false, status: "needs_setup" });
    expect(rows[0].platforms).to.deep.equal(["t-create-web"]);

    const updatedAt = rows[0].updatedAt;
    await SalesChannel.alive(adapter);
    rows = await channelsOf("t-create");
    expect(rows).to.have.length(1);
    expect(rows[0].updatedAt, "nothing changed, nothing written").to.equal(updatedAt);
  });

  it("status follows the provider and is written only when it changes", async () => {
    const adapter = new TestChannel("t-status", "mod-status");
    await SalesChannel.alive(adapter);
    adapter.status = { status: "ready" };
    const results = await SalesChannel.refreshStatus("t-status");
    const [row] = await channelsOf("t-status");
    expect(results[row.id]).to.deep.equal({ status: "ready" });
    expect(row.status).to.equal("ready");

    adapter.fail = new Error("token revoked");
    expect(await SalesChannel.channelStatus(row)).to.deep.equal({ status: "error", message: "token revoked" });
    expect((await SalesChannel.findOne({ id: row.id })).status).to.equal("error");
  });

  it("adopts an existing record (default key first) instead of creating a duplicate, fills empty platforms with free ones", async () => {
    await SalesChannel.create({ key: "t-adopt-op", title: "Operator", type: "t-adopt", providerModule: "mod-adopt", platforms: [] } as any).fetch();
    await SalesChannel.create({ key: "t-adopt", title: "Old module", type: "t-adopt", providerModule: "mod-adopt", platforms: [] } as any).fetch();
    await SalesChannel.create({ key: "t-other", title: "Other", type: "custom", platforms: ["t-adopt-taken"] } as any).fetch();

    await SalesChannel.alive(new TestChannel("t-adopt", "mod-adopt", { platforms: ["t-adopt-web", "t-adopt-taken"] }));
    const rows = await channelsOf("t-adopt");
    expect(rows).to.have.length(2);
    const adopted = rows.find((r) => r.key === "t-adopt");
    const operator = rows.find((r) => r.key === "t-adopt-op");
    expect(adopted.managedBy).to.equal("provider");
    expect(adopted.title, "operator fields untouched").to.equal("Old module");
    expect(adopted.platforms).to.deep.equal(["t-adopt-web"]);
    expect(operator.managedBy).to.equal("operator");
  });

  it("one provider per type: a second module is refused", async () => {
    const first = new TestChannel("t-single-provider", "mod-first");
    await SalesChannel.alive(first);
    await SalesChannel.alive(new TestChannel("t-single-provider", "mod-second"));
    expect(SalesChannel.getAdapter("t-single-provider")).to.equal(first);
    expect(SalesChannelRegistry.getType("t-single-provider").providerModule).to.equal("mod-first");
    expect(await channelsOf("t-single-provider")).to.have.length(1);
  });

  it("only worker 0 writes on boot, every worker registers the adapter", async () => {
    const previous = process.env.NODE_APP_INSTANCE;
    process.env.NODE_APP_INSTANCE = "1";
    try {
      const adapter = new TestChannel("t-worker", "mod-worker");
      await SalesChannel.alive(adapter);
      expect(SalesChannel.getAdapter("t-worker")).to.equal(adapter);
      expect(await channelsOf("t-worker")).to.have.length(0);
    } finally {
      if (previous === undefined) delete process.env.NODE_APP_INSTANCE;
      else process.env.NODE_APP_INSTANCE = previous;
    }
  });

  it("resolve() matches only an active channel: enabled + ready + live provider", async () => {
    const adapter = new TestChannel("t-resolve", "mod-resolve", { platforms: ["t-resolve-web"] });
    await SalesChannel.alive(adapter);
    const [row] = await channelsOf("t-resolve");
    await SalesChannel.updateOne({ id: row.id }, { enabled: true });
    expect(await SalesChannel.resolve("t-resolve-web"), "enabled but needs_setup").to.equal(null);

    adapter.status = { status: "ready" };
    await SalesChannel.refreshStatus("t-resolve");
    expect((await SalesChannel.resolve("t-resolve-web")).id).to.equal(row.id);
    expect((await SalesChannel.resolve("t-resolve")).id, "by key").to.equal(row.id);

    // A record of a type nobody provides never resolves, whatever is stored.
    await SalesChannel.create({ key: "t-orphan", title: "Orphan", type: "t-orphan", enabled: true, status: "ready", platforms: ["t-orphan-web"] } as any).fetch();
    expect(await SalesChannel.resolve("t-orphan-web")).to.equal(null);
  });

  it("removeProviderChannels(): untouched and operator channels go, an edited provider channel stays disabled", async () => {
    const adapter = new TestChannel("t-remove", "mod-remove", { platforms: ["t-remove-web"] });
    await SalesChannel.alive(adapter);
    await SalesChannel.create({ key: "t-remove-2", title: "Second", type: "t-remove", providerModule: "mod-remove", managedBy: "operator" } as any).fetch();
    const [own] = (await channelsOf("t-remove")).filter((r) => r.managedBy === "provider");
    // Switching on and off is not an edit.
    await SalesChannel.updateOne({ id: own.id }, { enabled: true });
    await SalesChannel.updateOne({ id: own.id }, { enabled: false });

    const result = await SalesChannel.removeProviderChannels("mod-remove");
    expect(result.removed.sort()).to.deep.equal(["t-remove", "t-remove-2"]);
    expect(adapter.deleted.sort()).to.deep.equal(["t-remove", "t-remove-2"]);
    expect(await channelsOf("t-remove")).to.have.length(0);
    expect(SalesChannel.getAdapter("t-remove"), "adapter dropped").to.equal(undefined);

    const edited = new TestChannel("t-edited", "mod-edited");
    await SalesChannel.alive(edited);
    const [row] = await channelsOf("t-edited");
    await SalesChannel.updateOne({ id: row.id }, { title: "Renamed", enabled: true });
    const second = await SalesChannel.removeProviderChannels("mod-edited");
    expect(second).to.deep.equal({ removed: [], disabled: ["t-edited"] });
    const kept = await SalesChannel.findOne({ id: row.id });
    expect(kept.enabled).to.equal(false);
    expect(describeChannelProvider(kept, new Set()).canDelete, "deletable once the module is gone").to.equal(true);
  });

  it("creating by hand needs an available type with a live provider and respects supportsMultipleInstances", async () => {
    expect((await checkCanCreate("custom")).error).to.equal("Channel type is not available yet");
    expect((await checkCanCreate("telegram-bot")).error, "core type without a provider is coming soon").to.equal("Channel type is not available yet");

    SalesChannelRegistry.registerType({ type: "t-not-loaded", title: "Not loaded", category: "custom", providerModule: "mod-not-loaded", marketplaceAppId: "mod-not-loaded" });
    const notLoaded = await checkCanCreate("t-not-loaded");
    expect(notLoaded.error).to.equal("Install the provider first");
    expect(notLoaded.extra).to.deep.equal({ marketplaceAppId: "mod-not-loaded" });

    await SalesChannel.alive(new TestChannel("t-single", "mod-single", { single: true }));
    expect((await checkCanCreate("t-single")).error).to.equal("This channel type allows only one channel");
    await SalesChannel.alive(new TestChannel("t-multi", "mod-multi"));
    expect(await checkCanCreate("t-multi")).to.equal(null);
  });

  it("a platform belongs to one channel; old duplicates are left alone", async () => {
    await SalesChannel.create({ key: "t-plat-a", title: "A", type: "custom", platforms: ["t-plat"] } as any).fetch();
    const b = await SalesChannel.create({ key: "t-plat-b", title: "B", type: "custom", platforms: ["t-plat"] } as any).fetch();
    const refusal = await checkPlatforms(["t-plat"], null);
    expect(refusal.params.platform).to.equal("t-plat");
    expect(["t-plat-a", "t-plat-b"]).to.include(refusal.params.key);
    expect(await checkPlatforms(["t-plat"], b), "already there before the rule").to.equal(null);
    expect(await checkPlatforms(["t-plat", "t-plat-new"], b)).to.equal(null);
  });

  it("switching on needs a fresh ready from the provider; provider channels are not deleted while installed", async () => {
    const adapter = new TestChannel("t-enable", "mod-enable");
    await SalesChannel.alive(adapter);
    const [row] = await channelsOf("t-enable");
    const notReady = await checkCanEnable(row, new Set(["mod-enable"]));
    expect(notReady.refusal.error).to.equal("Finish setup first");
    expect(notReady.refusal.extra).to.deep.equal({ settingsUrl: `/admin/mod-enable/setup?channel=${row.id}`, message: "Not built" });

    adapter.status = { status: "ready" };
    expect((await checkCanEnable(row, new Set(["mod-enable"]))).refusal).to.equal(null);

    expect(checkCanDelete(row, new Set(["mod-enable"])).status).to.equal(409);
    expect(checkCanDelete(row, new Set())).to.equal(null);
  });

  it("registry: region recommendations merge, core defaults keep a provider's type", () => {
    SalesChannelRegistry.registerRegionRecommendations({ ZZ: ["web-storefront", "telegram-bot"] });
    SalesChannelRegistry.registerRegionRecommendations({ zz: ["t-region", "web-storefront"] });
    expect(SalesChannelRegistry.recommendForCountry("ZZ")).to.deep.equal(["web-storefront", "telegram-bot", "t-region"]);

    expect(SalesChannelRegistry.getType("t-multi").comingSoon).to.equal(false);
    SalesChannelRegistry.registerType({ ...SalesChannelRegistry.getType("telegram-bot"), sourceModule: "mod-telegram", comingSoon: false });
    SalesChannelRegistry.registerCoreDefaults();
    expect(SalesChannelRegistry.getType("telegram-bot").comingSoon, "provider definition survives a core re-registration").to.equal(false);
    expect(SalesChannelRegistry.getType("custom").comingSoon).to.equal(true);
    expect(SalesChannelRegistry.getType("web-storefront").comingSoon).to.equal(false);

    SalesChannelRegistry.unregisterType("telegram-bot");
    SalesChannelRegistry.registerCoreDefaults();
  });
});
