/**
 * Mounts the auth-provider HTTP entry points as RAW express routes on the http app, so they sit
 * outside the Sails router and its CSRF guard (config/security.js `csrf: true`). These endpoints are
 * called by external parties — the browser returning from an OAuth redirect, and provider bot
 * servers (Telegram/MAX) — which cannot carry a Sails CSRF token. Security is enforced inside each
 * adapter's complete()/handleWebhook (state/nonce/PKCE, HMAC signatures), not by CSRF.
 *
 *   GET  /auth/:provider/callback   OAuth2/OIDC redirect (?code&state)
 *   POST /auth/:provider/webhook    bot webhook (JSON body)
 */
export default function bindAuthRoutes() {
  const app = sails.hooks.http?.app;
  if (!app) {
    sails.log.warn("CORE > bindAuthRoutes: http app not available");
    return;
  }

  // Controller ships inside core (../libs/AuthCallbackController); no host-app copy needed.
  const controller = require("../libs/AuthCallbackController").default;

  app.get("/auth/:provider/callback", (req: any, res: any) => controller.callback(req, res));

  // Raw express needs its own JSON body parser here (skipper/body parsing happens in the Sails
  // router pipeline which we are deliberately bypassing).
  const bodyParser = require("body-parser");
  const jsonParser = bodyParser.json({ limit: "1mb" });
  app.post("/auth/:provider/webhook", jsonParser, (req: any, res: any) => controller.webhook(req, res));

  sails.log.info("CORE > auth provider HTTP routes bound (/auth/:provider/callback, /auth/:provider/webhook)");
}
