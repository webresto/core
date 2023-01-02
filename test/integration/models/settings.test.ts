import { expect } from "chai";

describe("Settings", function () {

  it("Get from memory", async function () {
    await sleep(1000);
    await Settings.set("projectName", "test" )
    let setting = await Settings.get("projectName");
    expect(setting).to.equal("test")
  });

  it("Get from memory afterCreate", async function () {
    await Settings.set("test", {test: true});
    let setting = await Settings.get("test") as unknown as {test: boolean};
    expect(setting.test).to.equal(true)
  });

  it("Get from memory afterUpdate", async function () {
    await Settings.update({ key: "TEST"}, {value: "yep"}).fetch();
    let setting = await Settings.get("test");
    expect(setting).to.equal("yep")
  });

  it("Should set process.env", async function () {
    await Settings.set("test_123Test", true);
    expect(process.env.TEST_123_TEST).to.equal('true')
  });


});
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
