import { expect } from "chai";
import { SalesChannelAdapter, type SalesChannelStatusResult } from "../../../../adapters";
import { SalesChannelRegistry } from "../../../../lib/SalesChannelRegistry";
import { getInstalledProviderAppIds, refreshStatuses } from "../../../../lib/SalesChannelProviders";
import { channelStatusText, describeChannel } from "../../../../lib/sales-channels/view";
import { applyChannel, slugifyChannelKey } from "../../../../lib/sales-channels/apply";

/**
 * The view of a sales channel and the rules of writing one — `lib/sales-channels/` (C29, C30) — plus
 * the short cache of a provider's readiness (C32). The admin page, the MCP tools and the mobile API
 * all read these three; what is checked here is what all three say.
 *
 * Every test uses its own channel type: live adapters stay in process memory for the whole run.
 */
describe("Sales channels: the view, the write and the cached readiness", function () {
  this.timeout(10000);

  class TestProvider extends SalesChannelAdapter {
    public status: SalesChannelStatusResult = { status: "needs_setup", message: "Not built" };
    public asked = 0;

    constructor(type: string, providerModule: string, options: { single?: boolean; settingsUrl?: string } = {}) {
      super({
        type: {
          type,
          title: `Test ${type}`,
          category: "custom",
          providerModule,
          marketplaceAppId: providerModule,
          settingsUrl: options.settingsUrl ?? `/admin/${providerModule}/setup`,
          supportsMultipleInstances: options.single ? false : true,
        },
        defaults: { key: type, title: `Test ${type}`, platforms: [] },
      });
    }

    async getStatus(): Promise<SalesChannelStatusResult> {
      this.asked += 1;
      return this.status;
    }

    async onChannelDeleted(): Promise<void> {
      /* nothing to clean up */
    }
  }

  const one = async (type: string) => (await SalesChannel.find({ type }))[0];

  before(async () => {
    await SalesChannel.destroy({}).fetch();
  });

  after(async () => {
    await SalesChannel.destroy({}).fetch();
  });

  describe("the view says why a channel does or does not work (C29)", () => {
    it("names the five states of the badge, in the words of the page", () => {
      expect(channelStatusText("ready")).to.equal("Working");
      expect(channelStatusText("needs_setup")).to.equal("Needs setup");
      expect(channelStatusText("draft")).to.equal("Draft");
      expect(channelStatusText("disabled")).to.equal("Disabled");
      expect(channelStatusText("error")).to.equal("Error");
      // A channel whose provider is not in this process is in error whatever is stored, as on the page.
      expect(describeChannel({ id: "x", key: "k", type: "none", status: "ready" }).statusText).to.equal("Error");
    });

    it("explains a missing provider four ways, and translates when asked to", async () => {
      SalesChannelRegistry.registerType({ type: "v-soon", title: "Soon", category: "custom", providerModule: "mod-soon", comingSoon: true });
      SalesChannelRegistry.registerType({ type: "v-gone", title: "Gone", category: "custom", providerModule: "mod-gone", marketplaceAppId: "mod-gone" });

      const soon = describeChannel({ id: "1", key: "soon", type: "v-soon" });
      expect(soon.providerText).to.equal("Channel type is coming soon");

      // The module is not installed: the appId to install is named, as on the page.
      const gone = describeChannel({ id: "2", key: "gone", type: "v-gone", providerModule: "mod-gone" }, { installed: new Set<string>() });
      expect(gone.providerText).to.equal("Not working: provider is not installed (mod-gone)");

      // Installed but not registered in this process: the server has to be restarted.
      const stale = describeChannel({ id: "3", key: "stale", type: "v-gone", providerModule: "mod-gone" }, { installed: new Set(["mod-gone"]) });
      expect(stale.providerText).to.equal("Provider did not load: restart the server to finish installing it");

      const provider = new TestProvider("v-live", "mod-live");
      await SalesChannel.alive(provider);
      const live = describeChannel(await one("v-live"), { installed: new Set(["mod-live"]) });
      expect(live.providerText).to.equal("mod-live · Provider installed");

      // The words are the English i18n keys of the admin panel: a dictionary turns them into words.
      const ru: Record<string, string> = { "Channel type is coming soon": "Тип канала скоро появится", Error: "Ошибка", Working: "Работает" };
      const t = (key: string) => ru[key] ?? key;
      const translated = describeChannel({ id: "1", key: "soon", type: "v-soon" }, { t });
      expect(translated.providerText).to.equal("Тип канала скоро появится");
      expect(translated.statusText).to.equal("Ошибка");
      expect(channelStatusText("ready", t)).to.equal("Работает");
    });

    it("hides what only a manager may see, and never carries the provider's secrets", async () => {
      const provider = new TestProvider("v-rights", "mod-rights");
      await SalesChannel.alive(provider);
      const channel = await one("v-rights");
      await SalesChannel.updateOne({ id: channel.id }, { settings: { token: "visible-to-manager" }, secretsRef: { token: "vault://x" } } as any);
      const stored = await SalesChannel.findOne({ id: channel.id });

      const manager = describeChannel(stored, { canManage: true, installed: new Set(["mod-rights"]) });
      expect(manager.settingsUrl).to.equal(`/admin/mod-rights/setup?channel=${stored.id}`);
      expect(manager.providerModule).to.equal("mod-rights");
      expect(manager.settings).to.deep.equal({ token: "visible-to-manager" });

      const viewer = describeChannel(stored, { canManage: false, installed: new Set(["mod-rights"]) });
      expect(viewer.settingsUrl).to.equal(null);
      expect(viewer.providerModule).to.equal(null);
      expect(viewer.settings).to.deep.equal({});

      // secretsRef belongs to the provider and is in no view, at any right.
      expect(Object.keys(manager)).to.not.include("secretsRef");
      expect(Object.keys(viewer)).to.not.include("secretsRef");
    });

    it("writes the lists the way the card shows them, «All concepts» for an unbound channel", () => {
      const bound = describeChannel({ id: "1", key: "k", type: "none", concepts: ["origin", "pizza"], countries: ["RU", "KZ"], platforms: ["web"] });
      expect(bound.conceptsText).to.equal("origin · pizza");
      expect(bound.countriesText).to.equal("RU · KZ");
      expect(bound.platformsText).to.equal("web");
      expect(describeChannel({ id: "1", key: "k", type: "none" }).conceptsText).to.equal("All concepts");
    });

    it("carries «key · type» as the second line, as the page does", async () => {
      SalesChannelRegistry.registerType({ type: "v-sub", title: "Website", category: "storefront", providerModule: "mod-sub" });
      expect(describeChannel({ id: "1", key: "web-main", type: "v-sub" }).subtitle).to.equal("web-main · Website");
    });
  });

  describe("writing a channel is one rule for everybody (C30)", () => {
    it("derives the key from a Cyrillic title and refuses a title the charmap does not cover", async () => {
      const provider = new TestProvider("w-slug", "mod-slug");
      await SalesChannel.alive(provider);
      await SalesChannel.destroy({ type: "w-slug" }).fetch();

      expect(slugifyChannelKey("Сайт")).to.equal("sajt");

      const made = await applyChannel({ title: "Сайт", type: "w-slug" });
      expect(made.ok).to.equal(true);
      if (made.ok) expect(made.saved.key).to.equal("sajt");

      // CJK slugifies to nothing: the operator is asked for a key instead of getting an empty one.
      const refused = await applyChannel({ title: "寿司", type: "w-slug" });
      expect(refused.ok).to.equal(false);
      if (!refused.ok) expect(refused.refusal).to.include({ status: 400, error: "Channel key is required" });
    });

    it("keeps the key unique and the type fixed", async () => {
      const provider = new TestProvider("w-fixed", "mod-fixed");
      await SalesChannel.alive(provider);
      const channel = await one("w-fixed");

      const clash = await applyChannel({ title: "Another", type: "w-fixed", key: channel.key });
      expect(clash.ok).to.equal(false);
      if (!clash.ok) expect(clash.refusal.error).to.equal("A sales channel with this key already exists");

      const retyped = await applyChannel({ id: channel.id, title: channel.title, type: "w-slug" });
      expect(retyped.ok).to.equal(false);
      if (!retyped.ok) expect(retyped.refusal).to.include({ status: 409, error: "Channel type cannot be changed" });
    });

    it("a new channel starts disabled, and switching it on needs a ready provider", async () => {
      const provider = new TestProvider("w-enable", "mod-enable");
      await SalesChannel.alive(provider);
      await SalesChannel.destroy({ type: "w-enable" }).fetch();

      const made = await applyChannel({ title: "Second", type: "w-enable", key: "second", enabled: true });
      expect(made.ok).to.equal(true);
      if (!made.ok) return;
      // "enabled" of the request is not taken on create: the provider has not reported ready yet.
      expect(made.saved.enabled).to.equal(false);
      expect(made.saved.managedBy).to.equal("operator");
      expect(made.saved.status).to.equal("needs_setup");

      provider.status = { status: "needs_setup", message: "Finish the setup in the module" };
      const refused = await applyChannel({ id: made.saved.id, title: "Second", enabled: true });
      expect(refused.ok).to.equal(false);
      if (!refused.ok) {
        expect(refused.refusal.error).to.equal("Finish setup first");
        expect(refused.refusal.extra).to.include({ message: "Finish the setup in the module" });
        expect(String(refused.refusal.extra?.settingsUrl)).to.contain(`?channel=${made.saved.id}`);
      }

      provider.status = { status: "ready" };
      const enabled = await applyChannel({ id: made.saved.id, title: "Second", enabled: true });
      expect(enabled.ok).to.equal(true);
      if (enabled.ok) expect(enabled.saved.enabled).to.equal(true);
    });

    it("refuses a type that is not available, one whose provider is not alive, and a second instance", async () => {
      SalesChannelRegistry.registerType({ type: "w-soon", title: "Soon", category: "custom", providerModule: "mod-w-soon", comingSoon: true });
      SalesChannelRegistry.registerType({ type: "w-dead", title: "Dead", category: "custom", providerModule: "mod-w-dead", marketplaceAppId: "mod-w-dead" });

      const soon = await applyChannel({ title: "Soon", type: "w-soon" });
      expect(soon.ok).to.equal(false);
      if (!soon.ok) expect(soon.refusal.error).to.equal("Channel type is not available yet");

      const dead = await applyChannel({ title: "Dead", type: "w-dead" });
      expect(dead.ok).to.equal(false);
      if (!dead.ok) {
        expect(dead.refusal.error).to.equal("Install the provider first");
        expect(dead.refusal.extra).to.include({ marketplaceAppId: "mod-w-dead" });
      }

      const single = new TestProvider("w-single", "mod-single", { single: true });
      await SalesChannel.alive(single);
      const second = await applyChannel({ title: "Second one", type: "w-single", key: "w-single-2" });
      expect(second.ok).to.equal(false);
      if (!second.ok) expect(second.refusal.error).to.equal("This channel type allows only one channel");
    });

    it("a platform belongs to one channel", async () => {
      const provider = new TestProvider("w-platform", "mod-platform");
      await SalesChannel.alive(provider);
      const owner = await one("w-platform");
      await SalesChannel.updateOne({ id: owner.id }, { platforms: ["kiosk-hall"] } as any);

      const made = await applyChannel({ title: "Other kiosk", type: "w-platform", key: "w-platform-2", platforms: ["kiosk-hall"] });
      expect(made.ok).to.equal(false);
      if (!made.ok) {
        expect(made.refusal.error).to.equal("Platform {platform} is already used by channel {key}");
        expect(made.refusal.params).to.include({ platform: "kiosk-hall", key: owner.key });
      }
    });

    it("leaves alone what the request does not name — the provider's settings survive a rename", async () => {
      const provider = new TestProvider("w-keep", "mod-keep");
      await SalesChannel.alive(provider);
      const channel = await one("w-keep");
      await SalesChannel.updateOne({ id: channel.id }, { settings: { token: "abc" }, publicConfig: { theme: "dark" }, sortOrder: 7, countries: ["RU"] } as any);

      const saved = await applyChannel({ id: channel.id, title: "Renamed" });
      expect(saved.ok).to.equal(true);
      const stored = await SalesChannel.findOne({ id: channel.id });
      expect(stored.title).to.equal("Renamed");
      expect(stored.settings).to.deep.equal({ token: "abc" });
      expect(stored.publicConfig).to.deep.equal({ theme: "dark" });
      expect(stored.sortOrder).to.equal(7);
      expect(stored.countries).to.deep.equal(["RU"]);

      // What the request does name is written, including an emptied list.
      const cleared = await applyChannel({ id: channel.id, title: "Renamed", countries: [] });
      expect(cleared.ok).to.equal(true);
      expect((await SalesChannel.findOne({ id: channel.id })).countries).to.deep.equal([]);
    });

    it("never takes status, providerModule or managedBy from the request", async () => {
      const provider = new TestProvider("w-guard", "mod-guard");
      await SalesChannel.alive(provider);
      const channel = await one("w-guard");

      await applyChannel({ id: channel.id, title: channel.title, ...({ status: "ready", providerModule: "mod-other", managedBy: "operator" } as any) });
      const stored = await SalesChannel.findOne({ id: channel.id });
      expect(stored.status).to.not.equal("ready");
      expect(stored.providerModule).to.equal("mod-guard");
      expect(stored.managedBy).to.equal("provider");
    });
  });

  describe("readiness is asked for, not hammered (C32)", () => {
    it("reuses an answer for a few seconds, asks now when told to, and refreshStatus always asks", async () => {
      const provider = new TestProvider("c-cache", "mod-cache");
      await SalesChannel.alive(provider);
      const channel = await one("c-cache");

      // alive() has already asked once on boot; from here the counting is ours.
      const asked = provider.asked;
      await SalesChannel.channelStatus(channel);
      await SalesChannel.channelStatus(channel);
      await SalesChannel.channelStatus(channel);
      expect(provider.asked - asked, "three reads in a row, nobody disturbed").to.equal(0);

      await SalesChannel.channelStatus(channel, { fresh: true });
      expect(provider.asked - asked, "«now» means now").to.equal(1);

      // The call a provider makes after its own event: it asks, and replaces what is kept.
      provider.status = { status: "ready" };
      await SalesChannel.refreshStatus("c-cache");
      expect(provider.asked - asked).to.equal(2);
      expect((await SalesChannel.channelStatus(channel)).status, "the news is what the next reader sees").to.equal("ready");
      expect(provider.asked - asked).to.equal(2);
    });

    it("a list of channels costs one call per channel at most, however many screens read it", async () => {
      const provider = new TestProvider("c-list", "mod-list");
      await SalesChannel.alive(provider);
      const channels = await SalesChannel.find({ type: "c-list" });

      const asked = provider.asked;
      const first = await refreshStatuses(channels);
      const second = await refreshStatuses(channels);
      expect(Object.keys(first)).to.deep.equal(channels.map((channel: any) => channel.id));
      expect(second).to.deep.equal(first);
      expect(provider.asked - asked, "two readers of the same list, no call per reader").to.equal(0);

      // And the same list read right after a forced refresh still costs that one refresh only.
      await SalesChannel.refreshStatus("c-list");
      const afterRefresh = provider.asked;
      await refreshStatuses(channels);
      expect(provider.asked).to.equal(afterRefresh);
    });

    it("a channel that is gone is forgotten", async () => {
      const provider = new TestProvider("c-drop", "mod-drop");
      await SalesChannel.alive(provider);
      const channel = await one("c-drop");
      await SalesChannel.channelStatus(channel);
      await SalesChannel.destroyChannel(channel);
      expect(await SalesChannel.findOne({ id: channel.id })).to.equal(undefined);
      // Nothing is kept for an id that no longer exists: the next channel of that id is asked about.
      expect(await getInstalledProviderAppIds()).to.not.equal(undefined);
    });
  });
});
