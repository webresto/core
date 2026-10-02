import AuthService from "./AuthService";
import { NotificationManager } from "./NotificationManager";
import { NotificationTypeRegistry } from "./NotificationTypeRegistry";
import { CheckupCheckResult, SetupChecklistRegistry } from "./SetupChecklistRegistry";

/**
 * The changes whose notice is the alarm on the set of ways in (extend §6.2). Each is seeded as a
 * `*_sms` rule fixed to the sms channel; an event with no enabled rule, or a rule with no
 * registered channel, is that alarm switched off.
 */
const NOTICE_EVENTS = ["user_identity_linked", "user_identity_unlinked", "user_primary_phone_changed"];

/**
 * Setup-checklist items for the way in. Registered from afterHook rather than from
 * `SetupChecklistRegistry.registerCoreDefaults()`: they read the auth registry and the
 * notification catalog, which the registry's unit test has no business stubbing.
 *
 * Both are `required`. An installation where nobody can sign in, or where the login code has
 * nowhere to go, is the state an upgrade from 2.5 lands in — and neither the auth cycle nor the
 * pipeline reports it on its own (review2 §1.1). This is where the operator sees it before the
 * first customer does.
 */
export function registerAuthSetupCheckups(): void {
  SetupChecklistRegistry.registerCheckup({
    key: "auth_login_method",
    group: "project",
    severity: "required",
    titleKey: "Sign-in method enabled",
    descriptionKey: "Enable at least one healthy auth method that allows the login purpose",
    icon: "login",
    sourceModule: "core",
    sortOrder: 10,
    target: { url: "/model/authmethod" },
    check: async () => {
      const total = await AuthMethod.count();
      if (total === 0) return { status: "todo", detailKey: "No auth methods registered yet" };
      if (!(await AuthService.loginAvailable())) {
        return { status: "todo", detailKey: "{count} registered, none enabled and ready for login", detailParams: { count: total } };
      }
      return { status: "done" };
    },
  });

  SetupChecklistRegistry.registerCheckup({
    key: "otp_delivery",
    group: "project",
    severity: "required",
    titleKey: "Sign-in messages deliverable",
    descriptionKey: "The login code and the sign-in change notices each need an enabled rule with a registered channel",
    icon: "sms",
    sourceModule: "core",
    sortOrder: 11,
    target: { url: "/model/notificationrules" },
    check: async () => {
      // Two messages, one registry, one item: the login code, and the notice about a change to
      // the set of ways in. The notice is the whole safety net under a raised phone cardinality
      // — it goes to the number on record, on the one channel an attacker holding the session
      // does not hold (extend §6.2). Since review3 §1.8 it travels the pipeline like everything
      // else, so "deliverable" now also means "the rule is still enabled": an operator can
      // switch a rule off, and this is the place that says so. The direct send it replaced could
      // not be switched off — that is the price that change accepted, and this is the receipt.
      const routing = (eventKey: string) => {
        const rules = NotificationTypeRegistry.getByEvent(eventKey);
        // Fixed or waterfall, a listed channel is a filter the dispatcher applies; an empty list
        // means "any registered channel". "sms" is a kind of transport, not a vendor: whichever
        // SMS gateway module the installation runs registers its channel under that type.
        const wanted = Array.from(new Set(rules.flatMap((rule) => (rule.channelsMode === "fixed" ? rule.fixedChannels : rule.defaultChannels) || [])));
        const usable = wanted.length === 0
          ? NotificationManager.channels.map((channel) => channel.type)
          : wanted.filter((type) => NotificationManager.isChannelExist(type));
        return { enabled: rules.length > 0, wanted, usable };
      };

      const noticesOn = String((await Settings.get("AUTH_LINK_NOTICE_POLICY")) || "notify") !== "off";
      const muted = noticesOn ? NOTICE_EVENTS.filter((event) => routing(event).usable.length === 0) : [];
      const noticesMuted: CheckupCheckResult = {
        status: "todo",
        detailKey: "Sign-in change notices have no delivery: {events}",
        detailParams: { events: muted.join(", ") },
      };

      // Only the core's own OTP goes through the pipeline. A provider that delivers its code
      // itself (flash-call, an SMS gateway with its own adapter) needs no rule here.
      const viaPipeline = (await AuthService.proofMethodsFor(undefined, "login", {})).some((row) => row.adapter === "core");
      if (!viaPipeline) {
        return muted.length > 0 ? noticesMuted : { status: "done", detailKey: "Not used: the core OTP method is not enabled for login" };
      }

      const otp = routing("user_otp_requested");
      if (!otp.enabled) return { status: "todo", detailKey: "No enabled notification rule for user_otp_requested" };
      if (otp.usable.length === 0) {
        return { status: "todo", detailKey: "Rule enabled, but none of its channels is registered: {channels}", detailParams: { channels: otp.wanted.join(", ") || "(any)" } };
      }
      if (muted.length > 0) return noticesMuted;
      return { status: "done", detailKey: "Delivered via {channels}", detailParams: { channels: otp.usable.join(", ") } };
    },
  });
}
