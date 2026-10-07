import type { SalesChannelTypeDefinition } from "../../libs/SalesChannelRegistry";
import type { SalesChannelRecord } from "../../models/SalesChannel";

/** Readiness of one channel as reported by its provider. */
export type SalesChannelReadiness = "ready" | "needs_setup" | "error";

export interface SalesChannelStatusResult {
  status: SalesChannelReadiness;
  /** Short text for the channel card (English; core passes it through i18n). */
  message?: string;
}

export interface InitSalesChannelAdapter {
  /** Type definition; SalesChannel.alive() registers it in SalesChannelRegistry. */
  type: SalesChannelTypeDefinition;
  /** Used only when SalesChannel.alive() creates the provider's channel record. */
  defaults: {
    key: string;
    title: string;
    platforms: string[];
    url?: string | null;
  };
}

/**
 * Abstract contract for a sales-channel provider module (website, bot, kiosk, …). Mirrors
 * AuthProviderAdapter: the module builds one adapter per channel type it provides and calls
 * `await SalesChannel.alive(adapter)` from its boot hook. Core then creates (or adopts) the
 * provider's channel record and asks the adapter for readiness — it knows nothing about how
 * the provider decides that (built files, bot token, external contract).
 *
 * A provider owns all channels of its type: the first one comes from alive(), the operator
 * may add more on the "Custom channel" screen when `supportsMultipleInstances` allows it.
 * See ai-notes/sales-channels-research.md §8.2.
 */
export default abstract class SalesChannelAdapter {
  public readonly InitSalesChannelAdapter: InitSalesChannelAdapter;

  protected constructor(init: InitSalesChannelAdapter) {
    this.InitSalesChannelAdapter = init;
  }

  /** Convenience getter for the channel type slug. */
  public get type(): string {
    return this.InitSalesChannelAdapter.type.type;
  }

  /**
   * Readiness of this particular channel. Required: a provider that cannot tell whether its
   * channel works cannot be a channel. Core calls it often and with a timeout — cache
   * expensive checks (network calls) on the provider side.
   */
  public abstract getStatus(channel: SalesChannelRecord): Promise<SalesChannelStatusResult>;

  /**
   * (optional) The channel is being deleted by the operator or together with the provider
   * module. Clean up provider-side state: bot webhook, per-channel settings.
   */
  public async onChannelDeleted(channel: SalesChannelRecord): Promise<void> {}
}
