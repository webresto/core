import Decimal from "decimal.js";
import { MockBonusProgramAdapter } from "../../mocks/adapter/bonusProgram";
import { expect } from "chai";

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


  it("apply bonuses in order", async () => {
    const dishes = await Dish.find({});
    let user = await User.create({ id: "handleTestApply Bonus", login: "7723555", lastName: 'TESThandleTestApply', firstName: "test", phone: { code: "77", number: "23555" } }).fetch();
    let order = await Order.create({id: "test--apply--bonus", user: user.id}).fetch();
    
    await Order.addDish({id: order.id}, dishes[0], 5, [], "", "user");
    await Order.addDish({id: order.id}, dishes[1], 3, [], "", "user");
    
    let changedOrder = await Order.countCart({id: order.id});
    
    expect(changedOrder.uniqueDishes).to.equal(5);
    expect(changedOrder.dishesCount).to.equal(5 + 3 + 8 + 1 + 1); // 18
   
   
    expect(changedOrder.totalWeight).to.equal(new Decimal(100).times(changedOrder.dishesCount).plus(200).toNumber());
    expect(changedOrder.orderTotal).to.equal(new Decimal(100.1).times(changedOrder.dishesCount).plus(100.1).toNumber());

  });


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
