import AuthService from "./AuthService";
import { resolveRedirectBack } from "./authRedirect";
import { AuthCompleteInput } from "../adapters/auth/AuthAdapter";

/**
 * HTTP entry points every external party uses to finish an attempt:
 *
 *   GET  /auth/:adapter/callback   the browser coming back from an OAuth2/OIDC redirect
 *   POST /auth/:adapter/webhook    a provider's bot/telephony server pushing an update
 *
 * Both are mounted as raw express routes (see hook/bindAuthRoutes.ts), outside the Sails router
 * and its CSRF guard — neither an OAuth redirect nor a bot server can carry a CSRF token.
 * Authentication happens inside the adapter instead (state/nonce/PKCE, HMAC signatures), which
 * is why `complete()` and `handleWebhook()` are specified as "throws on a bad signature".
 *
 * The controller itself decides nothing: it verifies nothing, links nothing, and issues no
 * session. It hands the adapter's output to AuthService and reports the resulting status.
 */
/** customData comes back from Waterline as a string despite being declared "json". */
function customDataOf(attempt: any): Record<string, any> {
  const raw = attempt?.customData;
  if (typeof raw === "string") {
    try { return JSON.parse(raw || "{}"); } catch { return {}; }
  }
  return raw ?? {};
}

/**
 * End the callback. The SPA owns the outcome and reads it from authStatus, so every exit — done,
 * expired, refused, thrown — has to put the browser back in front of it. A plain-text status on
 * the API host is where a user used to be stranded when anything went wrong (review2 §3); it is
 * kept only for the case where the operator named no landing at all.
 */
function leave(res: any, landing: string | null, status: number, text: string) {
  if (landing) return res.redirect(landing);
  return res.status(status).send(text);
}

export default {
  /** OAuth2 / OIDC redirect target. Ends on the frontend, which is polling authStatus. */
  async callback(req: any, res: any) {
    const adapterSlug = String(req.params.adapter || "");
    // Resolved before anything can fail, so that a failure still has somewhere to send the
    // browser. redirectBack is client-supplied, so it is a destination only after the allowlist
    // agrees (review1 §1.4) — otherwise this route is an open redirect on a trusted domain. A
    // refused or absent value degrades to AUTH_CALLBACK_BASE_URL.
    let landing: string | null = null;
    try {
      const attemptId = String(req.query.state || req.query.attemptId || "");
      const attempt = await AuthAttempt.load(attemptId, { liveOnly: true });
      landing = await resolveRedirectBack(attempt ? customDataOf(attempt).redirectBack : undefined);
      if (!attempt) return leave(res, landing, 410, "Auth attempt expired or not found");

      const adapter = AuthMethod.getAdapter(attempt.methodAdapter as string, attempt.methodOffer as string);
      if (!adapter || typeof adapter.complete !== "function") return leave(res, landing, 404, "Unknown auth adapter");
      const offer = adapter.offers.find((o) => o.offer === attempt.methodOffer);
      if (!offer) return leave(res, landing, 404, "Unknown auth offer");

      const input: AuthCompleteInput = { query: req.query, body: req.body, attempt };
      const profile = await adapter.complete(input, offer);
      await AuthService.acceptProfile(attempt, profile, {
        deviceId: attempt.deviceId,
        userAgent: req.headers?.["user-agent"] ?? "",
        IP: req.ip ?? "",
      });

      // Whether the login is finished or now wants a code is read from authStatus, not from
      // this redirect.
      return leave(res, landing, 200, "You can close this window and return to the application");
    } catch (e) {
      sails.log.error(`AuthCallbackController.callback [${adapterSlug}]`, e);
      return leave(res, landing, 400, "Authorization failed");
    }
  },

  /**
   * Provider webhook. The adapter parses and authenticates the raw update itself and returns a
   * Signal, or null to ignore it — bots receive far more updates than the ones we care about.
   *
   * Duplicate and late signals come back as the attempt's current status, never as an error: a
   * repeat is absorbed by the CAS inside AuthService (И15, signal-idempotency.md), and a non-200
   * would only make the provider retry the thing it has already delivered.
   */
  async webhook(req: any, res: any) {
    const adapterSlug = String(req.params.adapter || "");
    try {
      const adapter = AuthMethod.getAdapterBySlug(adapterSlug);
      if (!adapter || typeof adapter.handleWebhook !== "function") {
        return res.status(404).json({ ok: false, error: "Unknown auth adapter" });
      }

      const signal = await adapter.handleWebhook(req.body ?? {}, { headers: req.headers });
      // Providers retry; an update we do not recognise must still be a 200 or they retry forever.
      if (!signal) return res.status(200).json({ ok: true, ignored: true });

      const attempt = await AuthService.handleSignal(signal, {
        userAgent: req.headers?.["user-agent"] ?? "",
        IP: req.ip ?? "",
      });
      return res.status(200).json({ ok: true, status: attempt?.status ?? "ignored" });
    } catch (e) {
      sails.log.error(`AuthCallbackController.webhook [${adapterSlug}]`, e);
      return res.status(400).json({ ok: false });
    }
  },
};
