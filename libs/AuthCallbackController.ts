/**
 * AuthCallbackController
 *
 * HTTP entry points for auth providers that can't finish over GraphQL:
 *   - GET  /auth/:provider/callback   OAuth2/OIDC redirect (?code&state) from the provider
 *   - POST /auth/:provider/webhook    bot webhook (Telegram / MAX "share contact" updates)
 *
 * Both funnel a verified NormalizedProfile through the same core AuthService.resolveFromProfile,
 * then flip the AuthState to `done` so the SPA (polling authStatus) can exchange for a JWT.
 * The browser is redirected back to redirectBack — the token is never put in the URL.
 *
 * Lives in core (bound as raw express routes by hook/bindAuthRoutes.ts) so the whole auth-provider
 * layer ships with the module — the host app no longer needs a copy under api/controllers.
 */

import { Adapter } from "../adapters";
import AuthService from "./AuthService";

async function resolveAndFinish(providerSlug: string, state: any, completeInput: any) {
  const adapter = await Adapter.getAuthAdapter(providerSlug);
  const profile = await adapter.complete(completeInput);

  const providerConfig = await AuthProvider.getBySlug(providerSlug);
  const ctx = { deviceId: state.deviceId, userAgent: "", IP: "0.0.0.0" };

  if (AuthService.needsPhoneConfirmation(profile, providerConfig, ctx)) {
    await AuthState.updateOne({ id: state.id }, { status: "awaiting_phone", pendingProfile: profile } as any);
    return { status: "awaiting_phone" };
  }

  const outcome = await AuthService.resolveFromProfile(profile, ctx);
  await AuthState.updateOne({ id: state.id }, { status: "done", resolvedUser: outcome.user.id } as any);
  return { status: "done", user: outcome.user };
}

export default {
  /** OAuth2/OIDC redirect target. */
  callback: async function (req: any, res: any) {
    const providerSlug = req.params.provider;
    const query = req.query || {};
    try {
      const stateId = query.state;
      if (!stateId) return res.status(400).send("Missing state");

      const state = await AuthState.getActive(stateId);
      if (!state) return res.status(400).send("Auth state expired or not found");
      if (state.provider !== providerSlug) return res.status(400).send("Provider mismatch");

      const result = await resolveAndFinish(providerSlug, state, { query, state });

      // Bounce the browser back to the SPA, which polls authStatus(stateId) → JWT.
      const back = state.redirectBack || (await Settings.get("AUTH_CALLBACK_BASE_URL")) || "/";
      const sep = back.includes("?") ? "&" : "?";
      const url = `${back}${sep}authState=${encodeURIComponent(stateId)}&status=${encodeURIComponent(result.status)}`;
      return res.redirect(url);
    } catch (e) {
      sails.log.error(`AuthCallbackController.callback [${providerSlug}]`, e);
      return res.status(500).send("Auth callback failed");
    }
  },

  /** Bot webhook (Telegram / MAX). The adapter matches the update to an AuthState via the start param. */
  webhook: async function (req: any, res: any) {
    const providerSlug = req.params.provider;
    try {
      const adapter = await Adapter.getAuthAdapter(providerSlug);

      // The adapter parses the update, finds the pending AuthState (by its `start` param),
      // and returns { stateId, profile } — or null if this update isn't a login.
      if (typeof adapter.handleWebhook !== "function") {
        return res.status(200).json({ ok: true, ignored: true });
      }
      const parsed = await adapter.handleWebhook(req.body || {}, { headers: req.headers || {} });
      if (!parsed || !parsed.stateId) {
        return res.status(200).json({ ok: true, ignored: true });
      }

      const state = await AuthState.getActive(parsed.stateId);
      if (!state) return res.status(200).json({ ok: true, expired: true });

      const providerConfig = await AuthProvider.getBySlug(providerSlug);
      const ctx = { deviceId: state.deviceId, userAgent: "", IP: "0.0.0.0" };

      if (AuthService.needsPhoneConfirmation(parsed.profile, providerConfig, ctx)) {
        await AuthState.updateOne({ id: state.id }, { status: "awaiting_phone", pendingProfile: parsed.profile } as any);
        return res.status(200).json({ ok: true, status: "awaiting_phone" });
      }

      const outcome = await AuthService.resolveFromProfile(parsed.profile, ctx);
      await AuthState.updateOne({ id: state.id }, { status: "done", resolvedUser: outcome.user.id } as any);
      return res.status(200).json({ ok: true, status: "done" });
    } catch (e) {
      sails.log.error(`AuthCallbackController.webhook [${providerSlug}]`, e);
      return res.status(200).json({ ok: false });
    }
  },
};
