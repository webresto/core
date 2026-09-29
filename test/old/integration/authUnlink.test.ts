import { expect } from "chai";
import AuthService from "../../libs/AuthService";
import { NormalizedProfile } from "../../adapters/auth/AuthProviderAdapter";

/**
 * Pins AuthService.unlink — the single core entry point for removing a provider link
 * (destroy AuthIdentity + best-effort adapter.revoke). See docs/journal MAX phone-spoofing.
 */
describe("AuthService.unlink", function () {
  this.timeout(20000);

  const otp = (deviceId: string) => ({ deviceId, confirmedByOtp: true });
  const profile = (externalId: string, number: string): NormalizedProfile =>
    ({ provider: "max", externalId, phone: { code: "7", number }, phoneVerifiedByProvider: true });

  it("removes the identity and returns the count", async function () {
    const out: any = await AuthService.resolveFromProfile(profile("MAX-unlink-1", "9997770001"), otp("unlink-dev-1"));
    expect(await AuthIdentity.findByExternal("max", "MAX-unlink-1")).to.exist;

    const removed = await AuthService.unlink(out.user.id, "max", "MAX-unlink-1");
    expect(removed).to.equal(1);
    expect(await AuthIdentity.findByExternal("max", "MAX-unlink-1")).to.not.exist;
  });

  it("is a no-op (returns 0) when there is nothing to unlink", async function () {
    expect(await AuthService.unlink("no-such-user", "max")).to.equal(0);
  });

  it("with externalId unlinks ONE account, leaving the user's other identities", async function () {
    // Two MAX identities on the same account (same phone → same user, different externalId).
    const a: any = await AuthService.resolveFromProfile(profile("MAX-A", "9997770010"), otp("unlink-dev-2"));
    await AuthService.resolveFromProfile(profile("MAX-B", "9997770010"), otp("unlink-dev-2"));
    expect(await AuthIdentity.findByExternal("max", "MAX-A")).to.exist;
    expect(await AuthIdentity.findByExternal("max", "MAX-B")).to.exist;

    const removed = await AuthService.unlink(a.user.id, "max", "MAX-A");
    expect(removed).to.equal(1);
    expect(await AuthIdentity.findByExternal("max", "MAX-A")).to.not.exist;
    expect(await AuthIdentity.findByExternal("max", "MAX-B"), "other identity kept").to.exist;
  });
});
