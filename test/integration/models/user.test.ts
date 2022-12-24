import { expect } from "chai";

describe("User", function () {
  it("createUser", async function () {
      User.create({id: "111", lastName: 'TEST', firstName: "111"})
  });

  it("setPassword", async function () {

  });
});
