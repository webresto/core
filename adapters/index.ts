import RMSAdapter, { ConfigRMSAdapter } from "./rms/RMSAdapter";
import CaptchaAdapter from "./captcha/CaptchaAdapter";
import { POW } from "./captcha/default/pow";
import { DefaultOTP } from "./otp/default/defaultOTP";
import LocalMediaFileAdapter from "./mediafile/default/local";
import OTPAdapter from "./otp/OneTimePasswordAdapter";
import MediaFileAdapter, { ConfigMediaFileAdapter } from "./mediafile/MediaFileAdapter";
import PaymentAdapter from "./payment/PaymentAdapter";
import * as fs from "fs";
import BonusProgramAdapter from "./bonusprogram/BonusProgramAdapter";
import { Config } from "../interfaces/Config";
import DeliveryAdapter from "./delivery/DeliveryAdapter";
import { DefaultDeliveryAdapter } from "./delivery/default/defaultDelivery";
import { PromotionAdapter } from "./promotion/default/promotionAdapter";
import MenuAdapter from "./menu/MenuAdapter";
import { DefaultMenuAdapter } from "./menu/default/defaultMenu";
import { SingleKitchenMenuAdapter } from "./menu/default/singleKitchenMenu";
import { RoutePlanner } from "./menu/route-contracts";
import { getMenuPlaceBasedMode } from "../lib/product-availability";
import AuthProviderAdapter from "./auth/AuthProviderAdapter";
// import DiscountAdapter from "./discount/AbstractDiscountAdapter";
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

/**
 * returns OTP-adapter
 */
export class OTP {
  /**
   * @deprecated use Adapter.getOTPAdapter instead
   * @param adapterName
   */
  public static async getAdapter(adapterName?: string): Promise<OTPAdapter> {
    return Adapter.getOTPAdapter(adapterName);
  }
}


export class Delivery {
  public static instanceDeliveryAdapter: DeliveryAdapter | null;

  /**
   * Adapters that registered themselves at boot, by lower-case name.
   *
   * There is one registry for delivery and it lives here — no separate street,
   * geocoder or zone-source registries. A module loaded as a sails hook cannot
   * be reached by the `@webresto/<name>-delivery-adapter` require path below,
   * so it announces itself instead, the same way auth providers do.
   */
  private static registered = new Map<string, DeliveryAdapter>();

  /** Forgets the cached instance so the next call re-reads `DELIVERY_ADAPTER`. */
  public static resetAdapter(): void {
    this.instanceDeliveryAdapter = null;
  }

  /**
   * Makes an adapter selectable by `DELIVERY_ADAPTER`.
   *
   * The cached instance is dropped, because a hook can finish loading after
   * something already asked for an adapter and got the default one.
   */
  public static register(name: string, adapter: DeliveryAdapter): void {
    if (!name) throw new Error("Delivery adapter name is required");
    this.registered.set(name.toLowerCase(), adapter);
    this.resetAdapter();
    sails.log.info(`CORE > Delivery adapter "${name}" registered`);
  }

  /**
   * Whether delivery is served by the built-in adapter.
   *
   * Asked by things that only make sense next to it — the zones module owns
   * `DeliveryZone`, and an installation delivering through somebody else’s
   * adapter has no use for a map of polygons nothing reads. The two ways of
   * saying “the built-in one” are the same two `getAdapter` accepts below.
   */
  public static async isDefault(): Promise<boolean> {
    const configured = await Settings.get("DELIVERY_ADAPTER");
    const name = typeof configured === "string" ? configured.trim() : "";
    return !name || name === "default";
  }

  /** Names currently available for `DELIVERY_ADAPTER`. */
  public static registeredNames(): string[] {
    return [...this.registered.keys()];
  }

  /**
   * returns Delivery-adapter
   *
   * Without an argument the configured `DELIVERY_ADAPTER` is used, falling back
   * to the default adapter — which is itself zone-aware, so an install with
   * local zones and no external source needs no adapter setting at all.
   */
  public static async getAdapter(adapter?: string | DeliveryAdapter): Promise<DeliveryAdapter> {
    // Return the singleton
    const cached = this.instanceDeliveryAdapter;
    if (cached) {
      return cached;
    }

    let adapterName: string = "";
    if (adapter) {
      if (typeof adapter === "string") {
        adapterName = adapter;
      } else if (adapter instanceof DeliveryAdapter) {
        this.instanceDeliveryAdapter = adapter;
        return adapter;
      }
    }

    if (!adapterName) {
      const configured = await Settings.get("DELIVERY_ADAPTER");
      adapterName = typeof configured === "string" ? configured.trim() : "";
    }

    if (!adapterName || adapterName === "default") {
      const instance = new DefaultDeliveryAdapter();
      this.instanceDeliveryAdapter = instance;
      return instance;
    }

    const alive = this.registered.get(adapterName.toLowerCase());
    if (alive) {
      this.instanceDeliveryAdapter = alive;
      return alive;
    }

    let adapterLocation = fs.existsSync(WEBRESTO_MODULES_PATH + "/" + adapterName.toLowerCase() + "-delivery-adapter")
      ? WEBRESTO_MODULES_PATH + "/" + adapterName.toLowerCase() + "-delivery-adapter"
      : fs.existsSync("@webresto/" + adapterName.toLowerCase() + "-delivery-adapter")
      ? "@webresto/" + adapterName.toLowerCase() + "-delivery-adapter"
      : adapterName;

    try {
      const adapterModule = require(adapterLocation);
      const instance = new adapterModule.DeliveryAdapter() as DeliveryAdapter;
      this.instanceDeliveryAdapter = instance;
      return instance;
    } catch (e) {
      sails.log.error("CORE > getAdapter Delivery adapter >  error; ", e);
      throw new Error("Module " + adapterLocation + " not found");
    }
  }
}

/**
 * Which menu adapter `MENU_PLACE_BASED_MODE` selects.
 *
 * The mode is the only switch: no `MENU_ADAPTER` setting sits next to it. Two
 * ways to say the same thing is how `supportsZoneSync` went wrong, and the mode
 * has existed since the first iteration precisely to answer this.
 *
 * `multi-place-route` belongs to the sixth iteration and to a module that does
 * not exist yet. Until one registers, the mode resolves to the default adapter
 * and says so loudly. That is the safe direction — a global menu is what every
 * installation already has — and the alternative, refusing to serve a menu at
 * all, would turn one wrong setting into a dark storefront.
 */
export class Menu {
  private static instance: MenuAdapter | null = null;
  private static registered = new Map<string, MenuAdapter>();

  /**
   * The route planner, when a module provides one.
   *
   * A single slot rather than a map: an order has one route, and two planners
   * would have to agree about it. The registry pattern is the delivery
   * extensions' — registering *is* the statement that routing is available, and
   * `MENU_PLACE_BASED_MODE` still decides whether it is used.
   */
  private static planner: RoutePlanner | null = null;

  public static useRoutePlanner(planner: RoutePlanner): void {
    if (!planner?.name) throw new Error("A route planner must have a name");
    if (this.planner && this.planner.name !== planner.name) {
      sails.log.warn(
        `CORE > Menu > route planner "${planner.name}" replaces "${this.planner.name}". ` +
        `An order has one route, so only the last registration is in force.`,
      );
    }
    this.planner = planner;
    sails.log.info(`CORE > Menu > route planner "${planner.name}" registered`);
  }

  /** `null` when nothing routes across kitchens, which is the default. */
  public static routePlanner(): RoutePlanner | null {
    return this.planner;
  }

  /** Forgets the cached instance so the next call re-reads the mode. */
  public static resetAdapter(): void {
    this.instance = null;
  }

  /**
   * Makes an adapter selectable by `MENU_PLACE_BASED_MODE`.
   *
   * A hook can finish loading after something already asked for a menu, so the
   * cached instance is dropped — the same rule delivery adapters follow.
   */
  public static register(name: string, adapter: MenuAdapter): void {
    if (!name) throw new Error("Menu adapter name is required");
    this.registered.set(name.toLowerCase(), adapter);
    this.resetAdapter();
    sails.log.info(`CORE > Menu adapter "${name}" registered`);
  }

  /** Names currently available for `MENU_PLACE_BASED_MODE`. */
  public static registeredNames(): string[] {
    return ["default", "single-place", ...this.registered.keys()];
  }

  public static async getAdapter(): Promise<MenuAdapter> {
    const cached = this.instance;
    if (cached) return cached;

    const mode = await getMenuPlaceBasedMode();

    const alive = this.registered.get(mode);
    if (alive) {
      this.instance = alive;
      return alive;
    }

    if (mode === "single-place") {
      this.instance = new SingleKitchenMenuAdapter();
      return this.instance;
    }

    if (mode !== "default") {
      sails.log.error(
        `CORE > Menu > MENU_PLACE_BASED_MODE is "${mode}" but no module registered a menu ` +
        `adapter under that name. Falling back to the global menu. Registered: ` +
        `[${this.registeredNames().join(", ")}]`,
      );
    }

    this.instance = new DefaultMenuAdapter();
    return this.instance;
  }
}

/** TODO: move other Adapters to one class adapter */
export class Adapter {
  // Singletons
  private static instanceRMS: RMSAdapter;
  private static instancePromotionAdapter: PromotionAdapter;
  private static instanceDeliveryAdapter: DeliveryAdapter;
  private static instanceMF: MediaFileAdapter;

  public static WEBRESTO_MODULES_PATH = process.env.WEBRESTO_MODULES_PATH === undefined ? "@webresto" : process.env.WEBRESTO_MODULES_PATH;

  public static async getOTPAdapter(adapterName?: string): Promise<OTPAdapter> {
    if (!adapterName) {
      adapterName = await Settings.get("DEFAULT_OTP_ADAPTER");
    }

    // Use default adapter POW (crypto-puzzle)
    if (!adapterName || adapterName === "default") {
      return new DefaultOTP();
    }

    let adapterLocation = WEBRESTO_MODULES_PATH + "/" + adapterName.toLowerCase() + "-otp-adapter";
    adapterLocation = fs.existsSync(adapterLocation) ? adapterLocation : "@webresto/" + adapterName.toLowerCase() + "-otp-adapter";

    try {
      const adapter = require(adapterLocation);
      return new adapter.OTPAdapter[adapterName]() as OTPAdapter;
    } catch (e) {
      sails.log.error("CORE > getAdapter OTP > error; ", e);
      throw new Error("Module " + adapterLocation + " not found");
    }
  }

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
      if (!adapterName) throw "RMS adapter is not installed";
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
   * returns Delivery-adapter
   * @deprecated use Class Delivery istead
   */
  public static async getDeliveryAdapter(adapter?: string | DeliveryAdapter): Promise<DeliveryAdapter> {
    // One resolution path, so `DELIVERY_ADAPTER` and the live registry apply no
    // matter which of the two entry points a caller happens to use. This one is
    // what `Order.countCart` calls on every cart recount.
    return Delivery.getAdapter(adapter);
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
   * returns PaymentAdapter-adapter
   */
  public static async getPaymentAdapter(adapterName?: string, initParams?: Config): Promise<PaymentAdapter> {
    if (!adapterName) {
      let defaultAdapterName = await Settings.get("DEFAULT_BONUS_ADAPTER");
      if (!defaultAdapterName) throw "BonusProgramAdapter is not set ";
    }

    let adapterLocation = this.WEBRESTO_MODULES_PATH + "/" + adapterName.toLowerCase() + "-payment-adapter";
    adapterLocation = fs.existsSync(adapterLocation) ? adapterLocation : "@webresto/" + adapterName.toLowerCase() + "-payment-adapter";

    try {
      const adapter = require(adapterLocation);
      return adapter.PaymentProgramAdapter[adapterName].getInstance(initParams) as PaymentAdapter;
    } catch (e) {
      sails.log.error("CORE > getAdapter Payment > error; ", e);
      throw new Error("Module " + adapterLocation + " not found");
    }
  }

  /**
   * returns a live Auth-provider adapter by its slug.
   * First checks providers that already self-registered into AuthProvider.alive() (modules
   * loaded as sails hooks, e.g. ru_auth_providers — AuthProvider is a sails global, same as
   * Settings above, so no import/circular-dependency concern here), then falls back to
   * requiring an `@webresto/<slug>-auth-adapter` npm module — mirroring getPaymentAdapter.
   */
  public static async getAuthAdapter(adapterName: string): Promise<AuthProviderAdapter> {
    if (!adapterName) throw "AuthProviderAdapter name is required";

    const alive = AuthProvider.getAdapter(adapterName);
    if (alive) {
      return alive;
    }

    let adapterLocation = this.WEBRESTO_MODULES_PATH + "/" + adapterName.toLowerCase() + "-auth-adapter";
    adapterLocation = fs.existsSync(adapterLocation) ? adapterLocation : "@webresto/" + adapterName.toLowerCase() + "-auth-adapter";

    try {
      const adapterModule = require(adapterLocation);
      const instance = new adapterModule.AuthProviderAdapter() as AuthProviderAdapter;
      // Constructing the adapter self-registers it into AuthProvider.alive(), which is the
      // single cache getAuthAdapter reads from — no separate bookkeeping needed here.
      await instance.wait();
      return instance;
    } catch (e) {
      sails.log.error("CORE > getAdapter Auth > error; ", e);
      throw new Error("Module " + adapterLocation + " not found");
    }
  }
}
