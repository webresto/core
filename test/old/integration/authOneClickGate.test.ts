import { expect } from "chai";
import AuthService from "../../libs/AuthService";
import { NormalizedProfile } from "../../adapters/auth/AuthProviderAdapter";
import { AuthProviderRecord } from "../../models/AuthProvider";

/**
 * Pins the one-click gate for phone-verified messenger providers (MAX):
 * the trust anchor is the (provider, externalId) identity, not the vCard phone.
 * A returning externalId whose bound phone is unchanged skips the OTP (one click);
 * first login and number change still require an OTP.
 * See docs/journal/2026-08-31-gfcafe-max-auth-phone-spoofing.md.
 */
describe("AuthService one-click gate (MAX repeat login)", function () {
  this.timeout(20000);

  const DEVICE = "oneclick-device-1";
  const P1 = { code: "7", number: "9995550001" };
  const P2 = { code: "7", number: "9995550002" };
  const EXT = "MAX-oneclick-ext-1";

  // Provider that does NOT trust the messenger phone and forces OTP verification (== MAX config).
  const cfg = { adapter: "max", trustProviderPhone: false, requirePhoneVerification: true } as unknown as AuthProviderRecord;
  const emptyCtx = { deviceId: DEVICE };
  const profile = (phone: any, ext = EXT): NormalizedProfile => ({
    provider: "max", externalId: ext, phone, phoneVerifiedByProvider: true, firstName: "T",
  });

  it("first login (no identity yet) requires OTP", async function () {
    const fresh = profile(P1, "MAX-oneclick-fresh");
    expect(await AuthService.needsPhoneConfirmation(fresh, cfg, emptyCtx)).to.equal(true);
  });

  it("after an OTP-confirmed login the identity is bound to the phone", async function () {
    const out: any = await AuthService.resolveFromProfile(profile(P1), { deviceId: DEVICE, confirmedByOtp: true });
    expect(out.status).to.equal("authorized");
    const identity = await AuthIdentity.findByExternal("max", EXT);
    expect(identity, "identity created").to.exist;
    expect(identity!.user).to.equal(out.user.id);
  });

  it("repeat login with the SAME phone is one-click (no OTP)", async function () {
    expect(await AuthService.needsPhoneConfirmation(profile(P1), cfg, emptyCtx)).to.equal(false);
  });

  it("a DIFFERENT phone for the same identity requires OTP (number change)", async function () {
    expect(await AuthService.needsPhoneConfirmation(profile(P2), cfg, emptyCtx)).to.equal(true);
  });

  it("a phone the provider vouches for is one-click when trustProviderPhone is on", async function () {
    const trusting = { adapter: "tg", trustProviderPhone: true, requirePhoneVerification: true } as unknown as AuthProviderRecord;
    expect(await AuthService.needsPhoneConfirmation(profile(P1), trusting, emptyCtx)).to.equal(false);
  });
});
