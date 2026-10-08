/**
 * Where the browser is allowed to land after an auth attempt (review1 §1.4).
 *
 * `redirectBack` arrives from the client in `authStart(redirectBack: …)`, lives in
 * `AuthAttempt.customData` and is handed to `res.redirect()` by AuthCallbackController. A value
 * that reaches a redirect unchecked is an open redirect on a domain the user already trusts —
 * the phishing hook is "you came back from payment/login", and the link genuinely does start on
 * our host, so nothing looks wrong until the target page asks for a password.
 *
 * The policy: a destination is trusted only if the operator named it.
 *   - a path on this server ("/account?login=ok") — no origin to check;
 *   - an absolute URL whose ORIGIN is on the allowlist, assembled from AUTH_CALLBACK_BASE_URL,
 *     the AUTH_REDIRECT_ALLOWED_ORIGINS setting, and the `url` of every enabled SalesChannel
 *     (the operator's own storefronts and app deep links).
 * Anything else falls back to AUTH_CALLBACK_BASE_URL, or to no redirect at all when even that is
 * unset. A rejected value behaves exactly like an absent one — the caller learns nothing about
 * the allowlist from the response.
 *
 * Matching is on the whole origin (scheme + host + port) and is exact: no suffix/subdomain rule,
 * because `endsWith(".example.com")` is how open redirects come back. The path is not
 * constrained — the host is the trust boundary, and the SPA owns its own routes.
 *
 * The attempt's own `salesChannel` is deliberately NOT used to narrow the list: that value comes
 * from the same client request as redirectBack, so tying one to the other adds no security.
 */

/** Schemes that must never be a redirect target, allowlisted or not. */
const DENIED_SCHEMES = ["javascript:", "data:", "vbscript:", "file:", "blob:"];

/**
 * Control characters and whitespace anywhere in the value. Refused outright rather than trusted
 * to survive header encoding intact: a newline in a Location is header injection, and a NUL or a
 * tab is there to make the parser here and the parser in the browser disagree about the host.
 */
function hasUnsafeChars(value: string): boolean {
  for (const char of value) {
    const code = char.codePointAt(0);
    if (code === undefined || code <= 0x20 || code === 0x7f) return true;
  }
  return false;
}

/**
 * Scheme + host + port of `value`, the key both sides of the comparison are reduced to.
 * `URL.origin` is "null" for non-special schemes, so custom app deep links ("myapp://auth")
 * are keyed by hand — those are exactly what a native client passes here.
 */
export function originKey(value: string): string | null {
  const raw = String(value ?? "").trim();
  if (!raw || hasUnsafeChars(raw)) return null;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }
  if (DENIED_SCHEMES.includes(url.protocol)) return null;
  if (url.origin && url.origin !== "null") return url.origin.toLowerCase();
  return `${url.protocol}//${url.host}`.toLowerCase();
}

/** Every origin the operator has declared as a place of their own. */
export async function allowedRedirectOrigins(): Promise<Set<string>> {
  const origins = new Set<string>();
  const add = (value: unknown) => {
    if (typeof value !== "string") return;
    const key = originKey(value);
    if (key) origins.add(key);
  };

  add(await Settings.get("AUTH_CALLBACK_BASE_URL"));

  const declared = await Settings.get("AUTH_REDIRECT_ALLOWED_ORIGINS");
  if (Array.isArray(declared)) declared.forEach(add);

  // A storefront that may create orders is a storefront a login may return to.
  try {
    const channels = await SalesChannel.find({ enabled: true });
    for (const channel of channels) add(channel.url);
  } catch (e) {
    // The allowlist must not depend on that table being queryable — the settings alone still work.
    sails.log.warn("CORE > authRedirect: could not read sales channels for the redirect allowlist", e);
  }

  return origins;
}

/**
 * A path on this server, safe to hand to res.redirect() as-is.
 *
 * "//evil.com" is protocol-relative and leaves the origin, and browsers normalise a leading
 * backslash into a slash, so "/\evil.com" leaves it too — a second separator of either kind in
 * first position disqualifies the value.
 */
function isSafePath(value: string): boolean {
  if (!value.startsWith("/")) return false;
  if (/^[/\\]{2}/.test(value)) return false;
  if (hasUnsafeChars(value)) return false;
  return true;
}

/**
 * Decide where the callback sends the browser. Returns a URL safe to redirect to, or null when
 * the browser should be left on the "you can close this window" page.
 */
export async function resolveRedirectBack(candidate: unknown): Promise<string | null> {
  const fallbackRaw = String((await Settings.get("AUTH_CALLBACK_BASE_URL")) || "").trim();
  const fallback = originKey(fallbackRaw) ? fallbackRaw : null;

  if (typeof candidate !== "string" || !candidate.trim()) return fallback;
  const wanted = candidate.trim();

  if (wanted.startsWith("/")) {
    if (isSafePath(wanted)) return wanted;
  } else {
    const key = originKey(wanted);
    if (key && (await allowedRedirectOrigins()).has(key)) return wanted;
  }

  // Loud on purpose: an operator who added a storefront and forgot the allowlist sees why their
  // users land on the wrong page, and an actual probe leaves a trace with the URL it tried.
  sails.log.warn(
    `CORE > authRedirect: refused redirectBack [${wanted}] — origin not allowed. ` +
      `Add it to AUTH_REDIRECT_ALLOWED_ORIGINS or to an enabled sales channel URL.`
  );
  return fallback;
}
