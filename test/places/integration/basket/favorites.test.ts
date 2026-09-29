import { expect } from "chai";
import { resetDatabase } from "../../support/reset";

/** A customer's favourite products: `handleFavoriteDish` toggles one in and out. */
describe("Favorites", function () {
  it("adds a product, adds another, and takes the first back out", async function () {
    await resetDatabase();
    const group = await Group.create({ name: "Group 1", enable: true }).fetch();
    const dish1 = await Dish.create({ name: "Dish 1", price: 100, enable: true, parentGroup: group.id }).fetch();
    const dish2 = await Dish.create({ name: "Dish 2", price: 100, enable: true, parentGroup: group.id }).fetch();
    const user = await User.create({ login: "15550000001", firstName: "Customer", lastName: "1", phone: { code: "1", number: "5550000001" } }).fetch();

    const favorites = async () => (await User.findOne({ id: user.id }).populate("favorites")).favorites.map((dish: any) => dish.name);

    await User.handleFavoriteDish(user.id, dish1.id);
    expect(await favorites()).to.deep.equal(["Dish 1"]);

    await User.handleFavoriteDish(user.id, dish2.id);
    expect(await favorites()).to.have.members(["Dish 1", "Dish 2"]);

    await User.handleFavoriteDish(user.id, dish1.id);
    expect(await favorites()).to.deep.equal(["Dish 2"]);
  });
});
