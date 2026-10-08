import sails from "@42pub/typed-sails";
import { Config } from "./Config";
import AwaitEmitter from "../lib/AwaitEmitter";
import { WorkTime } from "@webresto/worktime";
import { Country, Currency, CountryISOList, CurrencyISOList } from "./Country";

type sailsConfig = typeof sails.config;

interface SailsHooks {
  [key: string]: any | object | Function;
}



declare global {
  const emitter: AwaitEmitter;
  const NotificationManager: typeof import("../lib/notifications/NotificationManager").NotificationManager
  const DialogBox: typeof import("../lib/DialogBox").DialogBox
  const Adapter: typeof import("../adapters").Adapter
  //@ts-ignore *1
  interface Sails extends sails.Sails {
    [x: string]: {};
    on: any;
    emit: any;
    router: any;
    hooks: SailsHooks;
    models: any;
    config: _sailsConfig;
    log: any;
    after: any;
    dictionaries: ISailsDictionaries
    __: (...args: string[]) => string;
  }

  const sails: Sails;
  interface ISailsDictionaries {
    countries: { [iso in CountryISOList]: Country }
    currencies: { [iso in CurrencyISOList]: Currency };
  }

  //@ts-ignore *1
  interface _sailsConfig extends sailsConfig {
    restocore: Config;
    //@ts-ignore *1
    [key: string]: any | object;
  }
  //const sails: Sails;
  // TODO: *1 It appears that Sails, one of the projects available in the admin panel, is being imported incorrectly into this project. As a result, there is an "ignore" flag set everywhere. Ideally, we should abstract Sails.js to avoid this issue and improve the integration process.


  type ReqType = sails.Request;
  type ResType = sails.Response;

  interface SettingList {
    RESTOCORE_TIME_SYNC_PAYMENTS: number
    DEFAULT_CAPTCHA_ADAPTER: string
    DEFAULT_BONUS_ADAPTER: string
    RMS_ADAPTER: string
    DEFAULT_MEDIAFILE_ADAPTER: string
    /** Configured delivery adapter; empty means the built-in zone-aware default. */
    DELIVERY_ADAPTER: string
    /** Configured geo adapter; empty means the built-in default. */
    GEO_ADAPTER: string
    /** Server of the default geo adapter. */
    NOMINATIM_URL: string
    /** Allows the scheduled zone sync. Off unless an operator turns it on. */
    DELIVERY_ZONE_SYNC_ENABLED: boolean
    /** Zone sync interval; anything below 300 seconds is raised to 300. */
    DELIVERY_ZONE_SYNC_INTERVAL_SECONDS: number
    /** Allows one zone sync shortly after the application starts. */
    DELIVERY_ZONE_SYNC_ON_START: boolean
    /** Per-city map links the zone sync fetches. A city without one is drawn by hand. */
    DELIVERY_ZONE_SYNC_CONFIG: { [key: string]: any }
    /** XYZ tile template the zone editor draws its map from. */
    DELIVERY_ZONE_MAP_TILE_URL: string
    /** Credit line for those tiles. */
    DELIVERY_ZONE_MAP_ATTRIBUTION: string
    /** Delivery cost applied when the address falls outside every zone. */
    OUTSIDE_DELIVERY_AREA_DEFAULT_COST: number
    /** Delivery product charged when the address falls outside every zone. */
    OUTSIDE_DELIVERY_AREA_DEFAULT_ITEM: string
    MEDIAFILE_PARALLEL_TO_DOWNLOAD: number
    UUID_NAMESPACE: string
    NO_SYNC_NOMENCLATURE: boolean
    SYNC_PRODUCTS_INTERVAL_SECONDS: number
    RMS_LAST_SUCCESSFUL_MENU_DISHES_SYNC_AT: string
    NO_SYNC_OUT_OF_STOCKS: boolean
    SYNC_OUT_OF_STOCKS_INTERVAL_SECONDS: number
    RMS_LAST_SUCCESSFUL_STOPLISTS_SYNC_AT: string
    ROOT_GROUPS_RMS_TO_SYNC: string[]
    SKIP_LOAD_PRODUCT_IMAGES: boolean
    DELETE_EXISTING_IMAGES_BEFORE_SYNC: boolean
    SHOW_UNAVAILABLE_DISHES: boolean
    /** Source of the effective stock at a cooking point: local-only | rms-only | minimum */
    DISH_PLACE_BALANCE_MODE: string
    /** Ordered kitchen resolver names; the default asks all of them. Empty leaves delivery orders without a cooking point. */
    KITCHEN_RESOLVE_CHAIN: import("./Menu").KitchenStrategyName[]
    /** Straight-line cap when picking the nearest kitchen; 0 disables the limit. */
    DELIVERY_MAX_RADIUS_KM: number
    /** Which menu adapter is in force: default | single-place, or a name a module registers */
    MENU_PLACE_BASED_MODE: string
    /** Minutes added to every quoted delivery time to absorb estimate error. */
    DELIVERY_SAFETY_MARGIN_MINUTES: number
    /** Average courier speed used by the built-in straight-line travel estimate. */
    DELIVERY_CITY_SPEED_KMH: number
    /** Version of the multi-kitchen demo stock values already written. */
    MULTI_KITCHEN_DEMO_BALANCES_VERSION: string
    [key: `SLUG_MENU_TOP_LEVEL_CONCEPT_${string}`]: string
    SLUG_MENU_TOP_LEVEL: string
    ORDER_INIT_PRODUCT_ID: string
    ONLY_CONCEPTS_DISHES: boolean
    SEPARATE_CONCEPTS_ORDERS: boolean
    BONUS_SPENDING_STRATEGY: string
    CITY: string
    CHECKOUT_STRATEGY: { notRequired?: boolean }
    ORDER: { requireAll: boolean, justOne: boolean }
    FRONTEND_ORDER_PAGE: string
    FRONTEND_CHECKOUT_PAGE: string
    ALLOWED_PHONE_COUNTRIES: CountryISOList[]
    NAME_REGEX: string
    TZ: string
    POSSIBLE_TO_ORDER_IN_MINUTES: number
    DEFAULT_ENABLE_PAYMENT_METHODS: boolean
    ENABLE_BY_DEFAULT_ON_SYNC: boolean
    PROMOTION_ENABLE_BY_DEFAULT: boolean
    /** Proof layer — the per-attempt budget, plus the per-login one that spans attempts (И6) */
    OTP_MAX_ATTEMPTS: number
    OTP_RESEND_INTERVAL_SECONDS: number
    OTP_TTL_SECONDS: number
    /** AuthAttempt lifetime and resend cap */
    AUTH_STATE_TTL_SECONDS: number
    AUTH_OTP_MAX_RESENDS: number
    /** Per-target send ledger caps + the switch cap that keeps "another way in" finite (И6) */
    AUTH_MAX_SWITCHES: number
    AUTH_SEND_MAX_PER_TARGET_HOUR: number
    AUTH_SEND_MAX_PER_TARGET_DAY: number
    /**
     * Caps that hold when the source rotates: the ledger total and the country allowlist.
     * A device id or an IP is not a boundary — both are the attacker's to change — so what is
     * bounded here is the bill and the geography, not where the request came from (send-caps.md).
     */
    AUTH_SEND_MAX_GLOBAL_HOUR: number
    AUTH_SEND_ALLOWED_COUNTRIES: string[]
    AUTH_MAX_LIVE_ATTEMPTS_PER_DEVICE: number
    ALLOW_USER_WITHOUT_PHONE: boolean
    DEFAULT_ENABLE_AUTH_PROVIDERS: boolean
    AUTH_CALLBACK_BASE_URL: string
    /** Origins the post-login redirect is allowed to leave for; the base URL is always allowed */
    AUTH_REDIRECT_ALLOWED_ORIGINS: string[]
    /** Cardinality policy: how many ways in of each kind one account may hold (0 = unlimited) */
    AUTH_MAX_PHONE_IDENTITIES: number
    AUTH_MAX_IDENTITIES_PER_ADAPTER: number
    AUTH_ALLOW_PHONE_CHANGE: boolean
    AUTH_PHONE_CHANGE_KEEP_OLD: boolean
    /** Security notices on any change to the set of ways in (extend_user_account §6) */
    AUTH_LINK_NOTICE_POLICY: "off" | "notify" | "confirm"
    AUTH_INCUMBENT_PROTECT_HOURS: number
    /** CSV of normalized targets allowed to receive DEMO_MODE's fixed OTP code (review1 §2) */
    AUTH_DEMO_PHONES: string
    TIME_TO_SYNC_BONUSES_IN_MINUTES: number
    SYNC_BONUSTRANSACTION_AFTER_TIME: number
    DISABLE_USER_BONUS_PROGRAM_ON_FAIL: boolean
    ONLY_EXTERNAL_BONUS_SPEND_CHECK: boolean
    /**
     * Allows you to make shipping calculations optional. Shipping calculations will occur. But it won't throw an error
     */
    SOFT_DELIVERY_CALCULATION: boolean
    SOFT_DELIVERY_CALCULATION_MESSAGE: string

    // from base modules
    RESTOCORE_URL: string
    IMAGES_URL: string
    PROJECT_NAME: string
    DEFAULT_CURRENCY_ISO: string
    COUNTRY_ISO: CountryISOList

    LINK_TO_PROCESSING_PERSONAL_DATA: string
    LINK_TO_USER_AGREEMENT: string

    // from graphql
    ALLOW_BONUS_SPENDING: boolean
    DELIVERY_DESCRIPTION: string
    FIRSTNAME_REQUIRED: boolean
    WORK_TIME: WorkTime[]
    FIELDS_FOR_ORDER_INITIALIZATION: ("address" | "serviceType" | "pickupPoint" | "date" | "personsCount" | "comment" | "customer" | "promotionCode" | "paymentMethod" | "concept" | "maxWaitMinutes")[]
    /**
     * No anonymous cart: only an authenticated user may create one and put dishes in it.
     * Off = today's behaviour (guest cart keyed by deviceId).
     */
    REQUIRE_AUTH_FOR_CART: boolean
    /**
     * System-only notification channel runtime state.
     */
    NOTIFICATION_CHANNELS_STATE: Record<string, {
      enabled?: boolean
      sortOrder?: number
      cost?: number
    }>

    // for tests
    projectName: string
    test: any
    test_123Test: boolean
    EMITTER_CHECKOUT_STRATEGY: "NOT_REQUIRED" | "ALL_REQUIRED"
    /**
     * Strict phone check by mask
     */
    STRICT_PHONE_VALIDATION: boolean
    BONUS_BANNER_HTML_CHUNK: string
    DEFAULT_LOCALE: string
    ORDER_LOG_DISABLE: boolean
    ORDER_LOG_USE_MAP: boolean

    // Notifications
    NOTIFICATION_DELIVERY_RETRY_INTERVAL_SECONDS: number
    /**
     * How long a delivered ("sent") notification may stay unread before escalation tries the
     * next channel. Default: 5 (minutes). Pairs with NOTIFICATION_ESCALATION_INTERVAL_SECONDS.
     */
    NOTIFICATION_UNREAD_ESCALATION_MINUTES: number
    /**
     * How often the escalation loop ticks to re-scan sent-but-unread notifications (seconds).
     * This is the poll cadence, NOT the unread wait — see NOTIFICATION_UNREAD_ESCALATION_MINUTES.
     * Default: 60.
     */
    NOTIFICATION_ESCALATION_INTERVAL_SECONDS: number
    NOTIFICATION_LOG_DISABLE: boolean
    /**
     * Maximum total cost allowed per notification (sum across all channels used for one notification).
     * Channels whose cost would push the total above this limit are skipped.
     * If null/unset: only one paid channel (cost > 0) is allowed per delivery attempt.
     */
    NOTIFICATION_MAX_COST_PER_MESSAGE: number | null
    /**
     * Maximum number of channels to attempt per notification (the "waterfall" limit),
     * counting both successful and failed attempts across initial delivery and escalations.
     * Once this many channels have been tried, escalation stops. Default: 3.
     * Important notifications (important = true) are exempt and keep escalating.
     */
    NOTIFICATION_MAX_CHANNELS_PER_MESSAGE: number

    // Setup checklist
    /**
     * Runtime state for the setup checklist: per-checkup dismissals/snoozes.
     * The only persisted piece of the setup checklist feature.
     */
    SETUP_CHECKLIST_DISMISSED: Record<string, {
      dismissedAt: string
      snoozeUntil?: string
    }>
    /**
     * Per-check timeout (ms) when evaluating the setup checklist live. Default: 3000.
     */
    SETUP_CHECKLIST_CHECK_TIMEOUT_MS: number
  }
}
