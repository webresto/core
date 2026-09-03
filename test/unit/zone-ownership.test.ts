import { expect } from "chai";
import {
  ZoneOwnership,
  changedSourceOwnedFields,
  pickOperatorFields,
  zoneIsLocked,
  zoneSourceIsInactive,
} from "../../adapters/delivery/default/zone-ownership";

/**
 * Who may write what on a zone.
 *
 * The rule the whole module rests on: an adapter that can synchronise zones owns
 * their geometry, and the operator owns the commercial terms around it. These
 * are the two halves of that rule — the predicate the editor and the API share,
 * and the import stepping around a zone an operator has taken over.
 */
describe("Delivery zone ownership", function () {
  const ring = [
    [9, 9],
    [11, 9],
    [11, 11],
    [9, 9],
  ];
  const otherRing = [
    [9, 9],
    [12, 9],
    [12, 12],
    [9, 9],
  ];

  const synced = {
    id: "a",
    source: "kml",
    externalId: "z1",
    name: "North",
    polygon: ring,
    deliveryCost: 200,
  } as any;

  /** Ownership as the page reads it: which cities have a map link. */
  function ownershipOf(urls: Record<string, string>): ZoneOwnership {
    const urlFor = (city: string | null | undefined) => urls[city || ""] ?? null;
    return {
      sourceUrls: urls,
      activeSourceFor: (city) => (urlFor(city) ? "kml" : null),
      sourceUrlFor: urlFor,
    };
  }

  describe("the lock", function () {
    const synchronised = ownershipOf({ "": "https://maps.example/one" });

    it("locks a zone owned by the source configured for its city", function () {
      expect(zoneIsLocked(synced, synchronised)).to.equal(true);
    });

    it("leaves a local zone alone", function () {
      expect(zoneIsLocked({ id: "b", source: null } as any, synchronised)).to.equal(false);
    });

    it("releases a zone whose city no longer has a link", function () {
      // Nothing will overwrite it, and a frozen polygon with no way to fix it is
      // worse than an editable one.
      expect(zoneIsLocked(synced, ownershipOf({}))).to.equal(false);
      expect(zoneSourceIsInactive(synced, ownershipOf({}))).to.equal(true);
    });

    it("locks only the city that has a link", function () {
      // The defect the per-city rule fixes: one configured city used to lock the
      // polygons of every other one.
      const perCity = ownershipOf({ ekb: "https://maps.example/ekb" });
      const inEkb = { ...synced, city: "ekb" };
      const inPerm = { ...synced, city: "perm" };

      expect(zoneIsLocked(inEkb, perCity)).to.equal(true);
      expect(zoneIsLocked(inPerm, perCity)).to.equal(false);
    });
  });

  describe("the whitelist", function () {
    const posted = {
      name: "Renamed",
      polygon: otherRing,
      source: "kml",
      externalId: "z2",
      deliveryCost: 350,
      placeId: "kitchen-1",
      enable: false,
      description: "terms",
    } as any;

    it("keeps the operator's fields and drops the source's", function () {
      const kept = pickOperatorFields(posted);
      expect(kept).to.not.have.any.keys("name", "polygon", "source", "externalId");
      expect(kept.deliveryCost).to.equal(350);
      expect(kept.enable).to.equal(false);
      expect(kept.description).to.equal("terms");
    });

    it("does not call re-posting the same geometry an edit", function () {
      // The editor sends the whole zone on every save, so equality is the normal
      // case and must not produce an error.
      expect(changedSourceOwnedFields(synced, { ...synced, deliveryCost: 999 })).to.deep.equal([]);
    });

    it("names the source-owned fields a request would change", function () {
      expect(changedSourceOwnedFields(synced, { ...synced, polygon: otherRing })).to.deep.equal(["polygon"]);
      expect(changedSourceOwnedFields(synced, { ...synced, name: "South", externalId: "z9" }))
        .to.deep.equal(["name", "externalId"]);
    });
  });
});
