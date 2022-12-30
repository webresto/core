import { expect } from "chai";
import * as bcryptjs from "bcryptjs";

let user;
describe("User", function () {
  it("createUser", async function () {
     user = await User.create({id: "111", lastName: 'TEST', firstName: "111", phone: {code: "1", number:"123"}}).fetch();
     if (!user.id) throw `UserID undefined`
  });

  it("setPassword", async function () {
    await Settings.set("PasswordRegex", "[0-9]");
    await Settings.set("PasswordMinLength", "8");
    user = await User.setPassword(user.id, "1234567890", null);
    if (!await bcryptjs.compare("1234567890", user.passwordHash)) throw "Password hash is corrupt"
    // Check oldPassword
    user = await User.setPassword(user.id, "00000000", "1234567890");
    console.log(user)
  });
});
