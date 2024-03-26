import sails from "@42pub/typed-sails";
import { Config } from "./Config";
import AwaitEmitter from "../libs/AwaitEmitter";
import { WorkTime } from "@webresto/worktime";

type sailsConfig = typeof sails.config;

interface RestocoreHook {
  dictionaries: {
    countries: {
      [key:string]: {
        phoneCode: string;
        iso: string;
        name: string;
        nativeCountryName: string;
        language: string[];
        currency: string;
        currencySymbol: string;
        currencyISO: string;
        currencyUnit: string;
        currencyDenomination: number;
        phoneMask: string[];
        flag: string;
      }
    }
  }
  [key:string]: any | object | Function;
}

interface SailsHooks {
  restocore: RestocoreHook;
  [key:string]: any | object | Function;
}

declare global {
  const emitter: AwaitEmitter;
  const NotificationManager: typeof import("../libs/NotificationManager").NotificationManager
  const DialogBox: typeof import("../libs/DialogBox").DialogBox
  const Adapter: typeof import("../adapters").Adapter
  interface Sails extends sails.Sails {
    on: any;
    emit: any;
    router: any;
    hooks: SailsHooks;
    models: any;
    config: _sailsConfig;
    log: any;
    after: any;
  }
  interface _sailsConfig extends sailsConfig {
    restocore: Config;
    [key:string]: any | object;
  }
  const sails: Sails;
  type ReqType = sails.Request;
  type ResType = sails.Response;
  type PropType<TObj, TProp extends keyof TObj> = TObj[TProp];

  interface SettingList {
    RESTOCORE_TIME_SYNC_PAYMENTS: number
    CORE_LOGIN_FIELD: string
    CORE_LOGIN_OTP_REQUIRED: boolean
    CORE_SET_LAST_OTP_AS_PASSWORD: boolean
    CORE_PASSWORD_REQUIRED: boolean
    DEFAULT_CAPTCHA_ADAPTER: string
    DEFAULT_OTP_ADAPTER: string
    DEFAULT_BONUS_ADAPTER: string
    RMS_ADAPTER: string
    DEFAULT_MEDIAFILE_ADAPTER: string
    DELIVERY_COST: number
    DELIVERY_ITEM: string
    DELIVERY_MESSAGE: string
    FREE_DELIVERY_FROM: string
    MIN_DELIVERY_AMOUNT: number
    MIN_DELIVERY_TIME_IN_MINUTES: number
    MEDIAFILE_PARALLEL_TO_DOWNLOAD: number
    UUID_NAMESPACE: string
    NO_SYNC_NOMENCLATURE: boolean
    SYNC_PRODUCTS_INTERVAL_SECONDS: number
    NO_SYNC_OUT_OF_STOCKS: boolean
    SYNC_OUT_OF_STOCKS_INTERVAL_SECONDS: number
    ROOT_GROUPS_RMS_TO_SYNC: string[]
    SKIP_LOAD_PRODUCT_IMAGES: boolean
    SHOW_UNAVAILABLE_DISHES: boolean
    [key: `SLUG_MENU_TOP_LEVEL_CONCEPT_${string}`]: string
    SLUG_MENU_TOP_LEVEL: string
    ORDER_INIT_PRODUCT_ID: string
    ONLY_CONCEPTS_DISHES: boolean
    SEPARATE_CONCEPTS_ORDERS: boolean
    BONUS_SPENDING_STRATEGY: string
    CITY: string
    CHECKOUT_STRATEGY: { notRequired: boolean }
    ORDER: { requireAll: boolean, justOne: boolean }
    FRONTEND_ORDER_PAGE: string
    FRONTEND_CHECKOUT_PAGE: string
    ALLOWED_PHONE_COUNTRIES: string[]
    NAME_REGEX: string
    TZ: string
    POSSIBLE_TO_ORDER_IN_MINUTES: number
    DEFAULT_ENABLE_PAYMENT_METHODS: boolean
    PROMOTION_ENABLE_BY_DEFAULT: boolean
    PASSWORD_REGEX: string
    PASSWORD_MIN_LENGTH: number
    PASSWORD_POLICY: "required" | "from_otp" | "disabled"
    PASSWORD_SALT: number
    LOGIN_OTP_REQUIRED: boolean
    CREATE_USER_IF_NOT_EXIST: boolean
    TIME_TO_SYNC_BONUSES_IN_MINUTES: number
    SYNC_BONUSTRANSACTION_AFTER_TIME: number
    DISABLE_USER_BONUS_PROGRAM_ON_FAIL: boolean
    ONLY_EXTERNAL_BONUS_SPEND_CHECK: boolean

    // from base modules
    RESTOCORE_URL: string
    IMAGES_URL: string
    PROJECT_NAME: string
    DEFAULT_CURRENCY_ISO: string

    // from graphql
    ALLOW_BONUS_SPENDING: boolean
    DELIVERY_DESCRIPTION: string
    FIRSTNAME_REQUIRED: boolean
    WORK_TIME: WorkTime[]

    // for tests
    projectName: string
    test: any
    test_123Test: boolean
    PasswordRegex: string
    PasswordMinLength: string
  }
}
