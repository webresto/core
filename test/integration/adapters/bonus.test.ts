import Decimal from "decimal.js";
import { MockBonusProgramAdapter } from "../../mocks/adapter/bonusProgram";
import { expect } from "chai";
import { customer, address } from "../../mocks/customer"
import { OrderBonus } from "../../../interfaces/OrderBonus";
import User from "../../../models/User";
import Order from "../../../models/Order";
import BonusProgram from "../../../models/BonusProgram";
import BonusProgramAdapter from "../../../adapters/bonusprogram/BonusProgramAdapter";

let user: User;
let bp: BonusProgramAdapter;
let bonusProgram: BonusProgram;
let order1: Order;
describe("Bonus program adapter", function () {
  this.timeout(60000)

  before(async function() {
    var testBA = new MockBonusProgramAdapter();
    await BonusProgram.alive(testBA);
    bonusProgram = (await BonusProgram.update({adapter: "test"},{enable: true}).fetch())[0]
    user = await User.create({ id: "handletestapply-bonus-id", login: "7723555", lastName: 'TESThandleTestApply', firstName: "test", phone: { code: "77", number: "23555" } }).fetch();
    bp = await BonusProgram.getAdapter("test")
    let userBP = await UserBonusProgram.registration(user, "test");
    await UserBonusTransaction.create({bonusProgram: bp.id, user: user.id, isStable: true, amount: 500, isNegative: false}).fetch()
  });

  it("Bonus user must be registered", async () => {
    let userBP = await UserBonusProgram.findOne({user: user.id});
    expect(userBP.bonusProgram).to.equal(bonusProgram.id);
    expect(userBP.balance).to.equal(500);
  });

  it("apply bonuses in order on check", async () => {
    const dishes = await Dish.find({});
    order1 = await Order.create({id: "test--apply--bonus", user: user.id}).fetch();
    
    await Order.addDish({id: order1.id}, dishes[0], 5, [], "", "user");
    await Order.addDish({id: order1.id}, dishes[1], 3, [], "", "user");
    const bonusProgram = await BonusProgram.findOne({adapter: "test"});
    const spendBonus: OrderBonus =  {
      bonusProgramId: bonusProgram.id,
      amount: 5.23 // BonusProgram test has 1 decimal 
    }
    await Order.check({id: order1.id}, customer, true, undefined,  undefined, spendBonus);
    
    let checkedOrder = await Order.findOne({id: order1.id});

    expect(checkedOrder.bonusesTotal).to.equal(5.2);
  });


  it("check disable bonus program", async () => {
    bonusProgram = (await BonusProgram.update({adapter: "test"}, {enable: false}).fetch())[0];
    let error: Error | null = null;
  
    try {
      await Order.order({id: order1.id});
    } catch (e) {
      error = e;
    }
  
    expect(error).to.not.be.null;
  });
  


  it("order with bonus", async () => {
    bonusProgram = (await BonusProgram.update({adapter: "test"}, {enable: true}).fetch())[0];
    await Order.order({id: order1.id})
    let userBP = await UserBonusProgram.findOne({user: user.id});

    expect(userBP.balance).to.equal(494.8);
  });


  // it("check bonus strategies", async () => {

  // });
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
