import { MockBonusProgramAdapter } from "../../mocks/adapter/bonusProgram";

describe("Bonus program adapter", function () {
  this.timeout(60000)

  before(function (done) {
    const testBA = new MockBonusProgramAdapter();
    BonusProgram.alive(testBA).then(done);
   });

  it("Bonus get adapter", async () => {
    await BonusProgram.update({adapter: "test"},{enable: true}).fetch()
    let bp = await BonusProgram.getAdapter("test")
    if (!bp) throw `test adapter should be defined`
  });


  // it("apply bonuses in order", async () => {

  // });


  // it("check stable transactinon", async () => {

  // });


  // it("check disable bonus program", async () => {

  // });


  // it("check exchange rate and calculation", async () => {

  // });


  // it("check bonus strategies", async () => {

  // });
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
