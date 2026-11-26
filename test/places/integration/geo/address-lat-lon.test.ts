import { expect } from "chai";
import { geocoder } from "../../support/geocoder";
import { resetDatabase } from "../../support/reset";

/**
 * `Address.lat` and `Address.lon`: the coordinate of `point` as numbers, which the model writes on every create and
 * update - what a click on the map finds the nodes near it by, instead of reading the whole catalog of the city.
 *
 *   City 1: Street 1 (no point), house 1 on it; house 2 at the latitude of house 1, ~100 m east.
 */
describe("Address lat and lon", function () {
  let city: string;
  let street: any;
  const HOUSE_1 = { lat: 56.8421, lon: 60.664 };
  /** Same latitude, ~100 m east: outside the square of 10 m by the longitude alone. */
  const EAST = { lat: 56.8421, lon: 60.6656 };

  before(async function () {
    await resetDatabase();
    city = (await City.create!({ name: "City 1" }).fetch()).id;
    street = await Address.create!({ city, type: "street", name: "Street 1" }).fetch();
  });

  afterEach(function () {
    geocoder.around = undefined;
  });

  it("a node without a point has none", async function () {
    const row = await Address.findOne!({ id: street.id });
    expect(row?.lat ?? null).to.equal(null);
    expect(row?.lon ?? null).to.equal(null);
  });

  it("follow the point: written on create, moved with it, kept by an update without it, gone with it", async function () {
    const house = await Address.create!({ city, parent: street.id, type: "house", name: "1", point: HOUSE_1 }).fetch();
    expect([house.lat, house.lon]).to.deep.equal([HOUSE_1.lat, HOUSE_1.lon]);

    await Address.update!({ id: house.id }, { point: { lat: 56.85, lon: 60.67 } });
    let row = await Address.findOne!({ id: house.id });
    expect([row?.lat, row?.lon]).to.deep.equal([56.85, 60.67]);

    await Address.update!({ id: house.id }, { id: house.id, city, parent: street.id, type: "house", name: "1a" });
    row = await Address.findOne!({ id: house.id });
    expect([row?.name, row?.lat, row?.lon]).to.deep.equal(["1a", 56.85, 60.67]);

    await Address.update!({ id: house.id }, { point: null });
    row = await Address.findOne!({ id: house.id });
    expect([row?.lat ?? null, row?.lon ?? null]).to.deep.equal([null, null]);

    await Address.update!({ id: house.id }, { id: house.id, city, parent: street.id, type: "house", name: "1", point: HOUSE_1 });
  });

  it("a click finds a house by them - and not one at its latitude 100 m away", async function () {
    await Address.create!({ city, parent: street.id, type: "house", name: "2", point: EAST }).fetch();
    const geo = await Adapter.get("geo");

    const at = await geo.addressByCoordinate({ lat: HOUSE_1.lat + 0.00003, lon: HOUSE_1.lon }, city);
    expect(at?.formatted).to.include("1");
    expect(at?.coordinate).to.deep.equal(HOUSE_1);

    // halfway between the two houses: ~50 m from each - nothing of the catalog; the geocoder finds nothing either
    geocoder.around = () => [];
    expect(await geo.addressByCoordinate({ lat: HOUSE_1.lat, lon: (HOUSE_1.lon + EAST.lon) / 2 }, city)).to.equal(null);
  });
});
