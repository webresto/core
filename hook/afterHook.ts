import { generateUUID } from "../libs/hashCode";
import { NotificationDispatcher } from "../libs/NotificationDispatcher";
import { NotificationEventRegistry } from "../libs/NotificationEventRegistry";
import { NotificationTypeRegistry } from "../libs/NotificationTypeRegistry";
import { SetupChecklistRegistry } from "../libs/SetupChecklistRegistry";
import { DISMISSED_SETTING_JSON_SCHEMA } from "../libs/SetupChecklistService";
import { SalesChannelRegistry } from "../libs/SalesChannelRegistry";
import { NotificationService } from "../libs/NotificationService";
import { registerCoreMcpTools } from "./mcp";

/**
 * Initial RMS and set timezone if it was given
 */
export default async function () {
  try {

    // Mirror settings like JWT_SECRET from the DB into process.env on boot
    await Settings.syncEnvMirroredSettings();

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

    /**
     * @setting CORE_LOGIN_FIELD User login field source (ex: "phone", "email" ...) [read-only by default]
     */
    await Settings.set("CORE_LOGIN_FIELD", { key: "CORE_LOGIN_FIELD", value: "phone", readOnly: true });

    /**
     * @setting CORE_LOGIN_OTP_REQUIRED check OTP on a login process
     */
    await Settings.set("CORE_LOGIN_OTP_REQUIRED", { key: "CORE_LOGIN_OTP_REQUIRED", value: true });

    /**
     * @setting CORE_SET_LAST_OTP_AS_PASSWORD setting last OTP as password
     */
    await Settings.set("CORE_SET_LAST_OTP_AS_PASSWORD", { key: "CORE_SET_LAST_OTP_AS_PASSWORD", value: true });

    /**
     * @setting CORE_PASSWORD_REQUIRED Check password (Login only by OTP if false)
     */
    await Settings.set("CORE_PASSWORD_REQUIRED", { key: "CORE_PASSWORD_REQUIRED", value: true });


    /**
     * @setting VISIBLE_BY_DEFAULT_ON_SYNC Set visible: true for new dishes and groups from RMS sync
     */
    await Settings.set("VISIBLE_BY_DEFAULT_ON_SYNC", { key: "VISIBLE_BY_DEFAULT_ON_SYNC", value: true });

    try {
      /**
       * Run instance RMS
       */
      await Adapter.getRMSAdapter();
    } catch (error) {
      sails.log.warn(" RestoCore > RMS adapter is not set ");
    }

    // Typed notifications: register core events (registration ≠ enabling send),
    // then seed/load the notification rules catalog (NotificationRules model) into cache.
    NotificationEventRegistry.registerCoreDefaults();
    await NotificationTypeRegistry.load();

    // Setup checklist: register core checkups (live-evaluated, blocks nothing) and declare/seed
    // the dismissal store (the only persisted piece of the feature — see .ai-notes/setup-checklist.md).
    SetupChecklistRegistry.registerCoreDefaults();
    try {
      Settings.setDeclaredSetting("SETUP_CHECKLIST_DISMISSED");
      Settings.setDeclaredSetting("SETUP_CHECKLIST_CHECK_TIMEOUT_MS");
      if (await Settings.get("SETUP_CHECKLIST_DISMISSED") === undefined) {
        await Settings.set("SETUP_CHECKLIST_DISMISSED", {
          value: {} as any,
          type: "json",
          jsonSchema: DISMISSED_SETTING_JSON_SCHEMA as any,
          name: "Setup checklist dismissed items",
          description: "Runtime state: checkups the user hid/snoozed on the setup checklist.",
        });
      }
    } catch (e) {
      sails.log.warn("RestoCore > setup checklist dismissal seed skipped", e);
    }

    // Sales channels: register the core channel-type catalog + region recommendation matrix
    // (in-memory, modules add their own types), then add a setup-checklist item nudging the
    // operator to create their first channel. Channels (incl. their `platforms` list) are
    // configured manually by the operator — never auto-created/backfilled. See
    // ai-notes/sales-channels-research.md.
    try {
      SalesChannelRegistry.registerCoreDefaults();
      SetupChecklistRegistry.registerCheckup({
        key: "has_sales_channel",
        group: "project",
        severity: "required",
        titleKey: "At least one enabled sales channel",
        descriptionKey: "Create and enable a sales channel so orders have a known source",
        icon: "storefront",
        sourceModule: "core",
        sortOrder: 9,
        target: { url: "/sales-channels-manager" },
        check: async () => {
          const total = await SalesChannel.count();
          if (total === 0) return { status: "todo", detailKey: "No sales channels yet" };
          const enabled = await SalesChannel.count({ enabled: true });
          if (enabled === 0) {
            return { status: "todo", detailKey: "{count} created, none enabled — not ready", detailParams: { count: total } };
          }
          return { status: "done", detailKey: "{count} of {total} enabled", detailParams: { count: enabled, total } };
        },
      });
    } catch (e) {
      sails.log.warn("RestoCore > sales channels init skipped", e);
    }

    // Background notification loops are NOT cluster-safe (no cross-process claim
    // coordination): in PM2 cluster mode run them only in the first worker.
    // NODE_APP_INSTANCE is set by PM2 (0-based); absent in fork/plain node = run.
    const pm2Instance = Number(process.env.NODE_APP_INSTANCE ?? 0);
    if (Number.isFinite(pm2Instance) && pm2Instance > 0) {
      sails.log.info(`RestoCore > notification loops skipped on PM2 worker ${pm2Instance} (loops run only on worker 0)`);
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
