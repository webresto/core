import { generateUUID } from "../lib/hashCode";
import { NotificationDispatcher } from "../lib/notifications/NotificationDispatcher";
import { NotificationEventRegistry } from "../lib/notifications/NotificationEventRegistry";
import { NotificationTypeRegistry } from "../lib/notifications/NotificationTypeRegistry";
import { SetupChecklistRegistry } from "../lib/SetupChecklistRegistry";
import { SalesChannelRegistry } from "../lib/SalesChannelRegistry";
import { salesChannelCheckup } from "../lib/SalesChannelProviders";
import { NotificationService } from "../lib/notifications/NotificationService";
import { registerCoreMcpTools } from "./mcp";
import { CoreOtpAdapter } from "../adapters/auth/core/CoreOtpAdapter";
import { registerAuthSetupCheckups } from "../lib/authSetupCheckups";
import { isPrimaryWorker, workerIndex } from "../lib/cluster";
import AuthService from "../lib/AuthService";
import { startDefaultDelivery } from "../adapters";

/**
 * Initial RMS and set timezone if it was given
 */
export default async function () {
  try {
    const loadCoreSettingsManifests = process.env.CORE_LOAD_SETTINGS_MANIFESTS === "true";

    // Mirror settings like JWT_SECRET from the DB into process.env on boot
    await Settings.syncEnvMirroredSettings();

    // Legacy setups still seed settings through modulemanager. Keep manifests
    // opt-in so tests or targeted runs can enable the new path explicitly.
    if (loadCoreSettingsManifests) {
      await Settings.loadSettingsManifests();
    }

    const timeSyncPayments = await Settings.get("RESTOCORE_TIME_SYNC_PAYMENTS");

    /**
     * TIMEZONE
     *
     * The TZ setting can legitimately be empty (no default is applied for it).
     * In that case fall back to the TZ environment variable instead of
     * overwriting process.env.TZ with an empty string.
     */
    const tzSetting = await Settings.get("TZ");
    const timezone = (typeof tzSetting === "string" && tzSetting.trim() !== "")
      ? tzSetting
      : (process.env.TZ || undefined);
    if (timezone) {
      process.env.TZ = timezone;
    }

    if (await Settings.get("UUID_NAMESPACE") === undefined) {
      await Settings.set("UUID_NAMESPACE", {
        value: generateUUID()
      })
    }

    await PaymentDocument.processor(timeSyncPayments);

    /**
     * Setting default
     *
     * For food delivery, the phone is primary,
     * so we set the following flags by default.
     *
     * if they need to be changed, then use the
     * config/bootstrap.js,
     * seeds/settings.json,
     * environment variables (.env)
     *  */

    // CORE_SET_LAST_OTP_AS_PASSWORD and CORE_PASSWORD_REQUIRED used to be seeded here, and the
    // password they governed has since gone entirely (.ai-notes/auth/remove-password.md): there
    // is no way in but a proven AuthMethod. Their rows, together with PASSWORD_POLICY / REGEX /
    // MIN_LENGTH / SALT, go with the deferred settings cleanup in the auth-v2 migration.

    /**
     * @setting VISIBLE_BY_DEFAULT_ON_SYNC Set visible: true for new dishes and groups from RMS sync
     */
    await Settings.set("VISIBLE_BY_DEFAULT_ON_SYNC", { key: "VISIBLE_BY_DEFAULT_ON_SYNC", value: true });

    // Auth settings (see .ai-notes/auth/design2.md, .ai-notes/auth/extend_user_account.md) are
    // declared + seeded from their manifests by Settings.loadSettingsManifests() above.

    // The core's own phone_proof capability. It self-registers into AuthMethod exactly like a
    // module would, so the baseline "send a 6-digit code" is a registry row competing on
    // sortOrder with smsc/sms — not a fallback branch inside AuthService (design2 §4.1).
    try {
      await new CoreOtpAdapter().wait();
    } catch (e) {
      sails.log.error("RestoCore > core auth method registration failed", e);
    }

    // Periodic cleanup of expired auth attempts (releasing what they still hold at their
    // providers first — a leased dial-in number, design2 §10.5), and of the send ledger behind
    // the antiflood (kept a week — longer than the widest per-target window a cap can ask about).
    try {
      setInterval(() => { AuthService.sweepExpired().catch(() => {}); }, 5 * 60 * 1000);
      setInterval(() => { AuthSendLog.cleanup().catch(() => {}); }, 60 * 60 * 1000);
    } catch (e) {
      sails.log.warn("RestoCore > AuthAttempt cleanup loop skipped", e);
    }

    try {
      /**
       * Run instance RMS
       */
      await Adapter.getRMSAdapter();
    } catch (error) {
      sails.log.warn(" RestoCore > RMS adapter is not set ");
    }

    // The built-in delivery adapter's zone sync and its setup checkup.
    await startDefaultDelivery();

    // Typed notifications: register core events (registration ≠ enabling send),
    // then seed/load the notification rules catalog (NotificationRules model) into cache.
    NotificationEventRegistry.registerCoreDefaults();
    await NotificationTypeRegistry.load();

    // Setup checklist: register core checkups (live-evaluated, blocks nothing).
    // SETUP_CHECKLIST_DISMISSED (the only persisted piece of the feature — see
    // .ai-notes/setup-checklist.md) is declared + seeded from its manifest by
    // Settings.loadSettingsManifests(). SETUP_CHECKLIST_CHECK_TIMEOUT_MS has no
    // manifest (read from env/config on demand), so it is only declared here.
    SetupChecklistRegistry.registerCoreDefaults();
    // The way in: a sign-in method, and somewhere for the login code to go. Registered here
    // rather than in registerCoreDefaults because the checks read the auth registry and the
    // notification catalog loaded just above (review2 §1.1).
    registerAuthSetupCheckups();
    try {
      Settings.setDeclaredSetting("SETUP_CHECKLIST_CHECK_TIMEOUT_MS");
    } catch (e) {
      sails.log.warn("RestoCore > setup checklist declaration skipped", e);
    }

    // Sales channels: register the core channel-type catalog + region recommendation matrix
    // (in-memory). Channels themselves come from provider modules: a module installed from
    // the marketplace calls SalesChannel.alive(adapter) on boot, which registers its type and
    // creates (or adopts) its channel — disabled until the provider reports it ready and the
    // operator switches it on. The checklist item counts only ACTIVE channels (enabled +
    // ready + live provider). See ai-notes/sales-channels-research.md §8.2.
    try {
      SalesChannelRegistry.registerCoreDefaults();
      SetupChecklistRegistry.registerCheckup({
        key: "has_sales_channel",
        group: "project",
        severity: "required",
        titleKey: "At least one working sales channel",
        descriptionKey: "Install a sales channel from the marketplace, finish its setup and enable it so orders have a known source",
        icon: "storefront",
        sourceModule: "core",
        sortOrder: 9,
        ...salesChannelCheckup(),
      });
    } catch (e) {
      sails.log.warn("RestoCore > sales channels init skipped", e);
    }

    // Background notification loops are NOT cluster-safe (no cross-process claim
    // coordination): in PM2 cluster mode run them only in the primary worker (lib/cluster).
    if (!isPrimaryWorker()) {
      sails.log.info(`RestoCore > notification loops skipped on PM2 worker ${workerIndex()} (loops run only on worker 0)`);
    } else {
      // Notification delivery: retry pending + escalate unread sent
      const deliveryInterval = (await Settings.get("NOTIFICATION_DELIVERY_RETRY_INTERVAL_SECONDS")) ?? 60;
      const escalationInterval = (await Settings.get("NOTIFICATION_ESCALATION_INTERVAL_SECONDS")) ?? 60;
      NotificationDispatcher.startDeliveryLoop(deliveryInterval);
      NotificationDispatcher.startEscalationLoop(escalationInterval);

      // user_birthday trigger: hourly check, idempotent per user/year (dispatcher dedup).
      NotificationService.startBirthdayLoop();
    }

    registerCoreMcpTools();

  } catch (e) {
    sails.log.error("RestoCore > initialization error > ", e);
  }
}
