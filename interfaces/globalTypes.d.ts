import sails from "@42pub/typed-sails";
import { Config } from "./Config";
import AwaitEmitter from "../lib/AwaitEmitter";
import { WorkTime } from "@webresto/worktime";
import { Country, Currency, CountryISOList, CurrencyISOList } from "./Country";
type sailsConfig = typeof sails.config;
interface RestocoreHook {
    dictionaries: {
        countries: {
            [key: string]: {
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
            };
        };
    };
    [key: string]: any | object | Function;
}
interface SailsHooks {
    restocore: RestocoreHook;
    [key: string]: any | object | Function;
}
declare global {
    const emitter: AwaitEmitter;
    const NotificationManager: typeof import("../lib/notifications/NotificationManager").NotificationManager;
    const DialogBox: typeof import("../lib/DialogBox").DialogBox;
    const Adapter: typeof import("../adapters").Adapter;
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
        dictionaries: ISailsDictionaries;
        __: (...args: string[]) => string;
    }
    interface ISailsDictionaries {
        countries: {
            [iso in CountryISOList]: Country;
        };
        currencies: {
            [iso in CurrencyISOList]: Currency;
        };
    }
    interface _sailsConfig extends sailsConfig {
        restocore: Config;
        [key: string]: any | object;
    }
    type ReqType = sails.Request;
    type ResType = sails.Response;
    interface SettingList {
        RESTOCORE_TIME_SYNC_PAYMENTS: number;
        DEFAULT_CAPTCHA_ADAPTER: string;
        DEFAULT_BONUS_ADAPTER: string;
        RMS_ADAPTER: string;
        DEFAULT_MEDIAFILE_ADAPTER: string;
        DELIVERY_COST: number;
        DELIVERY_ITEM: string;
        DELIVERY_MESSAGE: string;
        FREE_DELIVERY_FROM: number;
        MIN_DELIVERY_AMOUNT: number;
        MIN_DELIVERY_TIME_IN_MINUTES: number;
        MEDIAFILE_PARALLEL_TO_DOWNLOAD: number;
        UUID_NAMESPACE: string;
        NO_SYNC_NOMENCLATURE: boolean;
        SYNC_PRODUCTS_INTERVAL_SECONDS: number;
        RMS_LAST_SUCCESSFUL_MENU_DISHES_SYNC_AT: string;
        NO_SYNC_OUT_OF_STOCKS: boolean;
        SYNC_OUT_OF_STOCKS_INTERVAL_SECONDS: number;
        RMS_LAST_SUCCESSFUL_STOPLISTS_SYNC_AT: string;
        ROOT_GROUPS_RMS_TO_SYNC: string[];
        SKIP_LOAD_PRODUCT_IMAGES: boolean;
        DELETE_EXISTING_IMAGES_BEFORE_SYNC: boolean;
        SHOW_UNAVAILABLE_DISHES: boolean;
        [key: `SLUG_MENU_TOP_LEVEL_CONCEPT_${string}`]: string;
        SLUG_MENU_TOP_LEVEL: string;
        ORDER_INIT_PRODUCT_ID: string;
        ONLY_CONCEPTS_DISHES: boolean;
        SEPARATE_CONCEPTS_ORDERS: boolean;
        BONUS_SPENDING_STRATEGY: string;
        CITY: string;
        CHECKOUT_STRATEGY: {
            notRequired?: boolean;
        };
        ORDER: {
            requireAll: boolean;
            justOne: boolean;
        };
        FRONTEND_ORDER_PAGE: string;
        FRONTEND_CHECKOUT_PAGE: string;
        ALLOWED_PHONE_COUNTRIES: string[];
        NAME_REGEX: string;
        TZ: string;
        POSSIBLE_TO_ORDER_IN_MINUTES: number;
        DEFAULT_ENABLE_PAYMENT_METHODS: boolean;
        PROMOTION_ENABLE_BY_DEFAULT: boolean;
        PASSWORD_REGEX: string;
        PASSWORD_MIN_LENGTH: number;
        PASSWORD_POLICY: "required" | "disabled";
        PASSWORD_SALT: number;
        OTP_MAX_ATTEMPTS: number;
        OTP_RESEND_INTERVAL_SECONDS: number;
        OTP_TTL_SECONDS: number;
        AUTH_STATE_TTL_SECONDS: number;
        AUTH_OTP_MAX_RESENDS: number;
        AUTH_MAX_SWITCHES: number;
        AUTH_SEND_MAX_PER_TARGET_HOUR: number;
        AUTH_SEND_MAX_PER_TARGET_DAY: number;
        AUTH_SEND_MAX_GLOBAL_HOUR: number;
        AUTH_SEND_ALLOWED_COUNTRIES: string[];
        AUTH_MAX_LIVE_ATTEMPTS_PER_DEVICE: number;
        ALLOW_USER_WITHOUT_PHONE: boolean;
        DEFAULT_ENABLE_AUTH_PROVIDERS: boolean;
        AUTH_CALLBACK_BASE_URL: string;
        AUTH_REDIRECT_ALLOWED_ORIGINS: string[];
        AUTH_MAX_PHONE_IDENTITIES: number;
        AUTH_MAX_IDENTITIES_PER_ADAPTER: number;
        AUTH_ALLOW_PHONE_CHANGE: boolean;
        AUTH_PHONE_CHANGE_KEEP_OLD: boolean;
        AUTH_LINK_NOTICE_POLICY: "off" | "notify" | "confirm";
        AUTH_INCUMBENT_PROTECT_HOURS: number;
        TIME_TO_SYNC_BONUSES_IN_MINUTES: number;
        SYNC_BONUSTRANSACTION_AFTER_TIME: number;
        DISABLE_USER_BONUS_PROGRAM_ON_FAIL: boolean;
        ONLY_EXTERNAL_BONUS_SPEND_CHECK: boolean;
        CHECK_DELIVERY_MESSAGE_TEMPLATE: string;
        /**
         * Allows you to make shipping calculations optional. Shipping calculations will occur. But it won't throw an error
         */
        SOFT_DELIVERY_CALCULATION: boolean;
        SOFT_DELIVERY_CALCULATION_MESSAGE: string;
        RESTOCORE_URL: string;
        IMAGES_URL: string;
        PROJECT_NAME: string;
        DEFAULT_CURRENCY_ISO: string;
        COUNTRY_ISO: CountryISOList;
        LINK_TO_PROCESSING_PERSONAL_DATA: string;
        LINK_TO_USER_AGREEMENT: string;
        ALLOW_BONUS_SPENDING: boolean;
        DELIVERY_DESCRIPTION: string;
        FIRSTNAME_REQUIRED: boolean;
        WORK_TIME: WorkTime[];
        FIELDS_FOR_ORDER_INITIALIZATION: ("address" | "selfService" | "pickupPoint" | "date" | "personsCount" | "comment" | "customer" | "promotionCode" | "paymentMethod" | "concept")[];
        /**
         * No anonymous cart: only an authenticated user may create one and put dishes in it.
         * Off = today's behaviour (guest cart keyed by deviceId).
         */
        REQUIRE_AUTH_FOR_CART: boolean;
        projectName: string;
        test: any;
        test_123Test: boolean;
        PasswordRegex: string;
        PasswordMinLength: string;
        EMITTER_CHECKOUT_STRATEGY: "JUST_ONE" | "NOT_REQUIRED" | "ALL_REQUIRED";
        EMITTER_ORDER_STRATEGY: "JUST_ONE" | "NOT_REQUIRED" | "ALL_REQUIRED";
        /**
         * Strict phone check by mask
         */
        STRICT_PHONE_VALIDATION: boolean;
        BONUS_BANNER_HTML_CHUNK: string;
        DEFAULT_LOCALE: string;
    }
}
export {};
