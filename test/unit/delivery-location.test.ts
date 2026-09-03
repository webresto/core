import { expect } from "chai";
import { resolveSelectedLocation } from "../../lib/delivery-location";
import {
  DeliveryLocationError,
  DeliveryLocationSearchResult,
} from "../../adapters/delivery/contracts";

describe("Delivery location resolution", function () {
  const monument: DeliveryLocationSearchResult = {
    id: "poi-1",
    kind: "organization",
    label: "Lenin Monument",
    organizationType: "monument",
  };

  it("prefers a coordinate supplied by the client over everything else", async function () {
    let geocoderCalls = 0;
    const resolved = await resolveSelectedLocation(
      { ...monument, coordinate: { lat: 10, lng: 10 }, street: "Svobody", home: "35" },
      {
        suppliedCoordinate: { lat: 55.75, lng: 37.61 },
        geocode: async () => {
          geocoderCalls++;
          return { lat: 0, lng: 0 };
        },
      },
    );

    expect(resolved.source).to.equal("client-coordinate");
    expect(resolved.coordinate).to.deep.equal({ lat: 55.75, lng: 37.61 });
    expect(geocoderCalls).to.equal(0);
  });

  it("accepts an organization coordinate without calling the geocoder", async function () {
    let geocoderCalls = 0;
    const resolved = await resolveSelectedLocation(
      { ...monument, coordinate: { lat: 55.75, lng: 37.61 } },
      {
        geocode: async () => {
          geocoderCalls++;
          return null;
        },
      },
    );

    expect(resolved.source).to.equal("organization-coordinate");
    expect(geocoderCalls).to.equal(0);
  });

  it("geocodes the address when street and house number are both known", async function () {
    const queries: string[] = [];
    const resolved = await resolveSelectedLocation(
      { ...monument, street: "Svobody", home: "35" },
      {
        geocode: async (parts) => {
          queries.push(`${parts.street} ${parts.home}`);
          return { lat: 55.75, lng: 37.61 };
        },
      },
    );

    expect(resolved.source).to.equal("geocoded-address");
    expect(queries).to.deep.equal(["Svobody 35"]);
  });

  it("qualifies the address with the city on the selection, not an installation-wide one", async function () {
    const cities: Array<string | undefined> = [];
    await resolveSelectedLocation(
      { ...monument, street: "Республики", home: "1", city: "Тюмень" },
      {
        geocode: async (parts) => {
          cities.push(parts.city);
          return { lat: 57.15, lng: 65.53 };
        },
      },
    );

    expect(cities).to.deep.equal(["Тюмень"]);
  });

  it("geocodes without a city when the selection carries none", async function () {
    // Not a silent substitution: an unqualified query is the honest one, and the
    // refusal for a customer who named no city is checkout's, not the geocoder's.
    const cities: Array<string | undefined> = [];
    await resolveSelectedLocation(
      { ...monument, street: "Республики", home: "1" },
      {
        geocode: async (parts) => {
          cities.push(parts.city);
          return { lat: 57.15, lng: 65.53 };
        },
      },
    );

    expect(cities).to.deep.equal([undefined]);
  });

  it("never sends an organization name to the geocoder", async function () {
    let geocoderCalls = 0;
    let error: unknown;

    try {
      await resolveSelectedLocation(monument, {
        geocode: async () => {
          geocoderCalls++;
          return { lat: 1, lng: 1 };
        },
      });
    } catch (thrown) {
      error = thrown;
    }

    expect(geocoderCalls).to.equal(0);
    expect(error).to.be.instanceOf(DeliveryLocationError);
    expect((error as DeliveryLocationError).code).to.equal("DELIVERY_LOCATION_UNRESOLVABLE");
  });

  it("refuses a street without a house number instead of guessing", async function () {
    let geocoderCalls = 0;
    let error: unknown;

    try {
      await resolveSelectedLocation(
        { id: "street-1", kind: "street", label: "Svobody", street: "Svobody" },
        {
          geocode: async () => {
            geocoderCalls++;
            return { lat: 1, lng: 1 };
          },
        },
      );
    } catch (thrown) {
      error = thrown;
    }

    expect(geocoderCalls).to.equal(0);
    expect((error as DeliveryLocationError).code).to.equal("DELIVERY_LOCATION_UNRESOLVABLE");
  });

  it("reports a geocoder failure separately from an unresolvable selection", async function () {
    let error: unknown;

    try {
      await resolveSelectedLocation(
        { id: "street-1", kind: "street", label: "Svobody 35", street: "Svobody", home: "35" },
        {
          geocode: async () => {
            throw new Error("network down");
          },
        },
      );
    } catch (thrown) {
      error = thrown;
    }

    expect((error as DeliveryLocationError).code).to.equal("DELIVERY_LOCATION_GEOCODER_FAILED");
  });

  it("ignores an invalid coordinate and falls through to the address", async function () {
    const resolved = await resolveSelectedLocation(
      { ...monument, coordinate: { lat: 999, lng: 0 }, street: "Svobody", home: "35" },
      { geocode: async () => ({ lat: 55.75, lng: 37.61 }) },
    );

    expect(resolved.source).to.equal("geocoded-address");
    expect(resolved.diagnostics).to.include("selected location carries an invalid coordinate");
  });

  it("gives the same selection the same answer every time", async function () {
    const first = await resolveSelectedLocation({ ...monument, coordinate: { lat: 55.75, lng: 37.61 } });
    const second = await resolveSelectedLocation({ ...monument, coordinate: { lat: 55.75, lng: 37.61 } });

    expect(first).to.deep.equal(second);
  });
});
