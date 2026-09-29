import { expect } from "chai";
import AuthService from "../../../../lib/AuthService";
import { NormalizedProfile } from "../../../../adapters/auth/AuthAdapter";
import { AuthProviderRecord } from "../../../../models/AuthProvider";
import { resetDatabase } from "../../support/reset";

/**
 * Logging in through a messenger provider. The trust anchor is the provider's
 * identity (`provider`, `externalId`), not the phone its card shows: the first
 * login and a change of number are confirmed by a one-time code, a returning
 * identity with the same number logs in with one click, and a provider trusted
 * for its phone never asks. An identity can be unlinked, one account at a time.
 */
describe("Auth providers", function () {
  const PHONE_1 = { code: "1", number: "5550000001" };
  const PHONE_2 = { code: "1", number: "5550000002" };
  /** Does not trust the messenger's phone and wants it confirmed. */
  const STRICT = { adapter: "provider-1", trustProviderPhone: false, requirePhoneVerification: true } as unknown as AuthProviderRecord;
  const TRUSTING = { adapter: "provider-2", trustProviderPhone: true, requirePhoneVerification: true } as unknown as AuthProviderRecord;

  const profile = (externalId: string, phone: any): NormalizedProfile => ({
    provider: "provider-1", externalId, phone, phoneVerifiedByProvider: true, firstName: "Customer",
  });
  const confirmed = (deviceId: string) => ({ deviceId, confirmedByOtp: true });

  beforeEach(async function () {
    await resetDatabase();
  });

  describe("the one-click gate", function () {
    it("a first login needs a code", async function () {
      expect(await AuthService.needsPhoneConfirmation(profile("external-1", PHONE_1), STRICT, { deviceId: "device-1" })).to.equal(true);
    });

    it("a confirmed login binds the identity to the customer, and the same number is one click after", async function () {
      const out: any = await AuthService.resolveFromProfile(profile("external-1", PHONE_1), confirmed("device-1"));

      expect(out.status).to.equal("authorized");
      expect((await AuthIdentity.findByExternal("provider-1", "external-1"))!.user).to.equal(out.user.id);
      expect(await AuthService.needsPhoneConfirmation(profile("external-1", PHONE_1), STRICT, { deviceId: "device-1" })).to.equal(false);
    });

    it("another number for the same identity needs a code", async function () {
      await AuthService.resolveFromProfile(profile("external-1", PHONE_1), confirmed("device-1"));
      expect(await AuthService.needsPhoneConfirmation(profile("external-1", PHONE_2), STRICT, { deviceId: "device-1" })).to.equal(true);
    });

    it("a provider trusted for its phone never asks", async function () {
      expect(await AuthService.needsPhoneConfirmation(profile("external-1", PHONE_1), TRUSTING, { deviceId: "device-1" })).to.equal(false);
    });
  });

  describe("unlinking", function () {
    it("removes the identity and says how many went", async function () {
      const out: any = await AuthService.resolveFromProfile(profile("external-1", PHONE_1), confirmed("device-1"));

      expect(await AuthService.unlink(out.user.id, "provider-1", "external-1")).to.equal(1);
      expect(await AuthIdentity.findByExternal("provider-1", "external-1")).to.not.exist;
    });

    it("is nothing to do for a customer with nothing linked", async function () {
      expect(await AuthService.unlink("user-9", "provider-1")).to.equal(0);
    });

    it("with an external id, takes one account and leaves the customer's others", async function () {
      // One number, so one customer, with two accounts of the same provider.
      const out: any = await AuthService.resolveFromProfile(profile("external-1", PHONE_1), confirmed("device-1"));
      await AuthService.resolveFromProfile(profile("external-2", PHONE_1), confirmed("device-1"));

      expect(await AuthService.unlink(out.user.id, "provider-1", "external-1")).to.equal(1);
      expect(await AuthIdentity.findByExternal("provider-1", "external-1")).to.not.exist;
      expect(await AuthIdentity.findByExternal("provider-1", "external-2")).to.exist;
    });
  });
});
