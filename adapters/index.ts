import RMSAdapter, { ConfigRMSAdapter } from "./rms/RMSAdapter";
import CaptchaAdapter from "./captcha/CaptchaAdapter";
import { POW } from "./captcha/default/pow";
import LocalMediaFileAdapter from "./mediafile/default/local";
import MediaFileAdapter, { ConfigMediaFileAdapter } from "./mediafile/MediaFileAdapter";
import PaymentAdapter from "./payment/PaymentAdapter";
import * as fs from "fs";
import BonusProgramAdapter from "./bonusprogram/BonusProgramAdapter";
import DeliveryAdapter from "./delivery/DeliveryAdapter";
import { DefaultDeliveryAdapter } from "./delivery/default/defaultDelivery";
import { PromotionAdapter } from "./promotion/default/promotionAdapter";
import AbstractPromotionAdapter, { AbstractPromotionHandler } from "./promotion/PromotionAdapter";
import MenuAdapter from "./menu/MenuAdapter";
import { DefaultMenuAdapter } from "./menu/default/defaultMenu";
import AuthAdapter from "./auth/AuthAdapter";
import GeoAdapter from "./geo/GeoAdapter";
import { DefaultGeoAdapter } from "./geo/default/defaultGeo";
export { default as SalesChannelAdapter } from "./sales-channel/SalesChannelAdapter";
export type { SalesChannelStatusResult, SalesChannelReadiness, InitSalesChannelAdapter } from "./sales-channel/SalesChannelAdapter";
// import DiscountAdapter from "./discount/AbstractDiscountAdapter";

// Code outside `adapters/` reaches an adapter only through this file: the base
// classes a module extends or types against, and the types they carry.
export { GeoAdapter, DeliveryAdapter, MenuAdapter, RMSAdapter, PaymentAdapter, BonusProgramAdapter, AuthAdapter, AbstractPromotionAdapter, AbstractPromotionHandler };
export type { RMSOutOfStockEventItem } from "./rms/RMSAdapter";
export type { BonusTransaction } from "./bonusprogram/BonusProgramAdapter";
export type { AuthFlowKind, NormalizedProfile } from "./auth/AuthAdapter";
export type { ResolvedCaptcha } from "./captcha/CaptchaAdapter";
// Core's boot starts what its own delivery adapter keeps running.
export { startDefaultDelivery } from "./delivery/default/start";
// The default adapters' "from a file" imports — the admin panel's buttons, and
// a stand seed that builds the same catalog without an operator.
export { parseGeoJson } from "./delivery/default/geojson";
export { importLocalZones } from "./delivery/default/zone-import";
export { importAddresses } from "./geo/default/address-import";

const WEBRESTO_MODULES_PATH = process.env.WEBRESTO_MODULES_PATH === undefined ? "@webresto" : process.env.WEBRESTO_MODULES_PATH;


/**
 * returns Captcha-adapter
 */
export class Captcha {
  public static async getAdapter(adapterName?: string): Promise<CaptchaAdapter> {
    if (!adapterName) {
      adapterName = await Settings.get("DEFAULT_CAPTCHA_ADAPTER");
    }

    // Use default adapter POW (crypto-puzzle)
    if (!adapterName || adapterName === "default") {
      return new POW();
    }

    let adapterLocation = WEBRESTO_MODULES_PATH + "/" + adapterName.toLowerCase() + "-captcha-adapter";
    adapterLocation = fs.existsSync(adapterLocation) ? adapterLocation : "@webresto/" + adapterName.toLowerCase() + "-captcha-adapter";

    try {
      const adapter = require(adapterLocation);
      return new adapter.CaptchaAdapter[adapterName]() as CaptchaAdapter;
    } catch (e) {
      sails.log.error("CORE > getAdapter Captcha > error; ", e);
      throw new Error("Module " + adapterLocation + " not found");
    }
  }
}

/** The kinds held by `Adapter.register` / `Adapter.get`, and the base class of each. */
type AdapterKinds = { geo: GeoAdapter; delivery: DeliveryAdapter; menu: MenuAdapter };
export type AdapterKind = keyof AdapterKinds;

/** The setting that names the active adapter of each kind. */
const ADAPTER_SETTING: Record<AdapterKind, string> = {
  geo: "GEO_ADAPTER",
  delivery: "DELIVERY_ADAPTER",
  menu: "MENU_PLACE_BASED_MODE",
};

/** TODO: move other Adapters to one class adapter */
export class Adapter {
  // Singletons
  private static instanceRMS: RMSAdapter;
  private static instancePromotionAdapter: PromotionAdapter;
  private static instanceMF: MediaFileAdapter;

  /** Adapters of geo, delivery and menu, by kind and lower-case name. Built on first use. */
  private static registry: { [K in AdapterKind]: Map<string, AdapterKinds[K]> } | null = null;
  private static builtIn: AdapterKinds | null = null;

  private static kinds() {
    if (!this.registry) {
      const menu = new DefaultMenuAdapter();
      this.builtIn = { geo: new DefaultGeoAdapter(), delivery: new DefaultDeliveryAdapter(), menu };
      this.registry = {
        geo: new Map([["default", this.builtIn.geo]]),
        delivery: new Map([["default", this.builtIn.delivery]]),
        // One instance, two names: `single-place` is a mode of the default menu.
        menu: new Map([["default", menu], ["single-place", menu]]),
      };
    }
    return { registry: this.registry, builtIn: this.builtIn! };
  }

  /** The name the kind's setting holds; empty is `default`. */
  public static async nameOf(kind: AdapterKind): Promise<string> {
    const configured = await Settings.get(ADAPTER_SETTING[kind] as any);
    const name = typeof configured === "string" ? configured.trim().toLowerCase() : "";
    return name || "default";
  }

  /**
   * Makes an adapter selectable by its kind's setting. Core registers its own as
   * `default` on first use; a module registers its own from its hook.
   */
  public static register<K extends AdapterKind>(kind: K, name: string, adapter: AdapterKinds[K]): void {
    if (!name) throw new Error(`A ${kind} adapter needs a name`);
    this.kinds().registry[kind].set(name.toLowerCase(), adapter);
    sails.log.info(`CORE > ${kind} adapter "${name}" registered`);
  }

  /** The one active adapter of a kind, the one its setting names. */
  public static async get<K extends AdapterKind>(kind: K): Promise<AdapterKinds[K]> {
    const name = await this.nameOf(kind);
    const adapter = this.kinds().registry[kind].get(name);
    if (!adapter) {
      throw new Error(`${ADAPTER_SETTING[kind]} is "${name}", but no ${kind} adapter is registered under that name`);
    }
    return adapter;
  }

  /** Whether the active adapter of a kind is the one core ships. */
  public static async isDefault(kind: AdapterKind): Promise<boolean> {
    const { registry, builtIn } = this.kinds();
    return registry[kind].get(await this.nameOf(kind)) === builtIn[kind];
  }

  public static WEBRESTO_MODULES_PATH = process.env.WEBRESTO_MODULES_PATH === undefined ? "@webresto" : process.env.WEBRESTO_MODULES_PATH;

  public static getPromotionAdapter(adapter?: string | PromotionAdapter, initParams?: {[key: string]:string | number | boolean}): PromotionAdapter {

    let adapterName: string;
    if (adapter) {
      if (typeof adapter === "string") {
        adapterName = adapter;
      } else if (adapter instanceof PromotionAdapter) {
        this.instancePromotionAdapter = adapter;
        return this.instancePromotionAdapter;
      } else {
        throw new Error("Adapter should be a string or instance of PromotionAdapter");
      }
    }

    // Return the singleon
    if (this.instancePromotionAdapter) {
      return this.instancePromotionAdapter;
    }

    if (!adapterName) {
      this.instancePromotionAdapter = new PromotionAdapter;
      return this.instancePromotionAdapter
    }

    let adapterLocation = this.WEBRESTO_MODULES_PATH + "/" + adapterName.toLowerCase() + "-promotion-adapter";
    adapterLocation = fs.existsSync(adapterLocation) ? adapterLocation : "@webresto/" + adapterName.toLowerCase() + "-promotion-adapter";

    try {
      const adapterModule = require(adapterLocation);
      this.instancePromotionAdapter = new adapterModule.PromotionAdapter(initParams);
      return this.instancePromotionAdapter;
    } catch (e) {
      sails.log.error("CORE > getAdapter Promotion > error; ", e);
      throw new Error("Module " + adapterLocation + " not found");
    }
  }

  /**
   * returns BonusProgram-adapter
   */
  public static async getBonusProgramAdapter(adapter?: string | BonusProgramAdapter, initParams?: { [key: string]: string | number | boolean }): Promise<BonusProgramAdapter> {

    let adapterName: string;
    if (adapter) {
      if (typeof adapter === "string") {
        adapterName = adapter;
      } else if (adapter instanceof BonusProgramAdapter) {
        return adapter;
      } else {
        throw new Error("Adapter should be a string or instance of BonusProgramAdapter");
      }
    }

    if (!adapterName) {
      let defaultAdapterName = await Settings.get("DEFAULT_BONUS_ADAPTER");
      if (!defaultAdapterName) throw "BonusProgramAdapter is not set ";
    }

    let adapterLocation = this.WEBRESTO_MODULES_PATH + "/" + adapterName.toLowerCase() + "-bonus-adapter";
    adapterLocation = fs.existsSync(adapterLocation) ? adapterLocation : "@webresto/" + adapterName.toLowerCase() + "-bonus-adapter";

    try {
      const adapter = require(adapterLocation);
      return adapter.BonusProgramAdapter[adapterName].getInstance(initParams) as BonusProgramAdapter;
    } catch (e) {
      sails.log.error("CORE > getAdapter Bonus > error; ", e);
      throw new Error("Module " + adapterLocation + " not found");
    }
  }

  /**
   * returns RMS-adapter
   */
  public static async getRMSAdapter(adapter?: string | RMSAdapter, initParams?: ConfigRMSAdapter): Promise<RMSAdapter> {
    // Return the singleton
    if (this.instanceRMS) {
      return this.instanceRMS;
    }

    let adapterName: string;
    if (adapter) {
      if (typeof adapter === "string") {
        adapterName = adapter;
      } else if (adapter instanceof RMSAdapter) {
        this.instanceRMS = adapter;
        return this.instanceRMS;
      } else {
        throw new Error("Adapter should be a string or instance of rmsadapter");
      }
    }

    if (!adapterName) {
      adapterName = await Settings.get("RMS_ADAPTER");
      if (!adapterName) throw new Error("RMS adapter is not installed");
    }

    let adapterLocation = this.WEBRESTO_MODULES_PATH + "/" + adapterName.toLowerCase() + "-rms-adapter";
    adapterLocation = fs.existsSync(adapterLocation) ? adapterLocation : "@webresto/" + adapterName.toLowerCase() + "-rms-adapter";

    try {
      const adapterModule = require(adapterLocation);
      this.instanceRMS = new adapterModule.RMSAdapter(initParams);
      return this.instanceRMS;
    } catch (e) {
      sails.log.error("CORE > getAdapter RMS >  error; ", e);
      throw new Error("Module " + adapterLocation + " not found");
    }
  }

  /**
   * returns MediaFile-adapter
   */
  public static async getMediaFileAdapter(adapter?: string | MediaFileAdapter, initParams?: ConfigMediaFileAdapter): Promise<MediaFileAdapter> {
    // Return the singleton
    if (this.instanceMF) {
      return this.instanceMF;
    }

    let adapterName: string;
    if (adapter) {
      if (typeof adapter === "string") {
        adapterName = adapter;
      } else if (adapter instanceof MediaFileAdapter) {
        this.instanceMF = adapter;
        return this.instanceMF;
      } else {
        throw new Error("Adapter should be a string or instance of rmsadapter");
      }
    }

    let adapterLocation: string = "";

    if (!adapterName) {
      adapterName = await Settings.get("DEFAULT_MEDIAFILE_ADAPTER");
      if (!adapterName || adapterName === "default") {
        this.instanceMF = new LocalMediaFileAdapter(initParams);
        return this.instanceMF;
      }
    }

    if (!adapterLocation) {
      adapterLocation = this.WEBRESTO_MODULES_PATH + "/" + adapterName.toLowerCase() + "-mediafile-adapter";
      adapterLocation = fs.existsSync(adapterLocation) ? adapterLocation : "@webresto/" + adapterName.toLowerCase() + "-mediafile-adapter";
    }

    try {
      const adapterModule = require(adapterLocation);
      this.instanceMF = new adapterModule.MediaFileAdapter(initParams);
      return this.instanceMF;
    } catch (e) {
      sails.log.error("CORE > getAdapter MediaFile >  error; ", e);
      throw new Error("Module " + adapterLocation + " not found");
    }
  }

  /**
   * Auth adapters are NOT resolved here. A module self-registers every offer it declares into
   * the AuthMethod registry from its constructor, and `AuthMethod.getAdapter(adapter, offer)`
   * hands back the live instance. A second resolution path next to that registry could only
   * ever disagree with it about which module owns a slug — which is exactly the defect the
   * registry's conflict check exists to kill (design2 §4.1, Д1).
   */
}
