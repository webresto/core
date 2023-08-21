import { expect } from "chai";

describe("Favorites", function () {
  
  it("Handle favorite dish", async function () {
    let user = await User.create({id: "handleFavoriteDish", login: "1123555", lastName: 'TESThandleFavoriteDish', firstName: "111", phone: {code: "1", number:"123555"}}).fetch();
    let dishes = await Dish.find({});
    await User.handleFavoriteDish(user.id, dishes[0].id);

    user = await User.findOne({id: user.id}).populate("favorites");
    if (user.favorites[0].id !== dishes[0].id) throw `Favorite dish not match with added`

    await User.handleFavoriteDish(user.id, dishes[1].id);
    user = await User.findOne({id: user.id}).populate("favorites");
    let favoriteIds = user.favorites.map((i)=> i.id)
    if (!favoriteIds.includes(dishes[0].id)) throw `Favorite dish not found`
    if (!favoriteIds.includes(dishes[1].id)) throw `Favorite dish not found`

    await User.handleFavoriteDish(user.id, dishes[0].id);
    user = await User.findOne({id: user.id}).populate("favorites");
    favoriteIds = user.favorites.map((i)=> i.id)
    if (favoriteIds.includes(dishes[0].id)) throw `Deleted favorite dish found`
    if (favoriteIds[0] !== dishes[1].id) throw `Dish not match`
  }); 
});
