import Decimal from "decimal.js";
import { InMemoryBonusProgramAdapter } from "../../mocks/adapter/bonusProgram";
import { expect } from "chai";
import { customer, address } from "../../mocks/customer"
import { SpendBonus } from "../../../interfaces/SpendBonus";
import User from "../../../models/User";
import Order from "../../../models/Order";
import BonusProgram from "../../../models/BonusProgram";
import BonusProgramAdapter from "../../../adapters/bonusprogram/BonusProgramAdapter";

let user: User;
let bp: BonusProgramAdapter;
let bonusProgram: BonusProgram;
let bonusProgramNoTx: BonusProgram;
let order1: Order;
let order2: Order;

let UBP: string;
let UBPnoTX: string;

describe("bonus program adapter (with transaction support)", function () {
  this.timeout(60000)

  before(async function() {
    try {
      var testBA = new InMemoryBonusProgramAdapter();
      
      var testBA_noTransactionsList = new InMemoryBonusProgramAdapter({
        adapter: "test-notx",
        hasGetTransactionsSupport: false
      });
      
      // Add both transactions
      await BonusProgram.alive(testBA);
      await BonusProgram.alive(testBA_noTransactionsList);
      
      bonusProgram = (await BonusProgram.update({adapter: "test"},{enable: true}).fetch())[0]
      bonusProgramNoTx = (await BonusProgram.update({adapter: "test-notx"},{enable: true}).fetch())[0]

      user = await User.create({ id: "handletestapply-bonus-id", login: "7723555", lastName: 'TESThandleTestApply', firstName: "test", phone: { code: "77", number: "23555" } }).fetch();
      bp = await BonusProgram.getAdapter("test")
      
      UBP = (await UserBonusProgram.registration(user, "test")).id;
      UBPnoTX = (await UserBonusProgram.registration(user, "test-notx")).id;

      await UserBonusTransaction.create({bonusProgram: bp.id, user: user.id, isStable: true, amount: 100500, isNegative: false}).fetch()
      await UserBonusTransaction.create({bonusProgram: bp.id, user: user.id, isStable: true, amount: 123456, isNegative: false}).fetch()

    } catch (error) {
      console.error(error)
    }
  });

  it("bonus user must be registered and have balance", async () => {
    const userBP = await UserBonusProgram.findOne({id: UBP});
    expect(userBP.balance + userBP.balance).to.equal(100500);

    const userBPnoTX = await UserBonusProgram.findOne({id: UBPnoTX});
    expect(userBP.balance + userBPnoTX.balance).to.equal(123456);
  });

  it("apply bonus in order on check (with tx)", async () => {
    const dishes = await Dish.find({});
    order1 = await Order.create({id: "test--apply--bonus", user: user.id}).fetch();
    
    await Order.addDish({id: order1.id}, dishes[0], 5, [], "", "user");
    await Order.addDish({id: order1.id}, dishes[1], 3, [], "", "user");
    const bonusProgram = await BonusProgram.findOne({adapter: "test"});
    const spendBonus: SpendBonus =  {
      bonusProgramId: bonusProgram.id,
      amount: 5.23 // BonusProgram test has 1 decimal 
    }

    await Order.check({id: order1.id}, customer, true, undefined,  undefined, spendBonus);
    
    let checkedOrder = await Order.findOne({id: order1.id});

    expect(checkedOrder.bonusesTotal).to.equal(5.2);
  });


  it("apply bonus in order on check (with notx)", async () => {
    const dishes = await Dish.find({});
    order2 = await Order.create({id: "test--apply--bonus-notx", user: user.id}).fetch();
    
    await Order.addDish({id: order2.id}, dishes[0], 5, [], "", "user");
    await Order.addDish({id: order2.id}, dishes[1], 3, [], "", "user");
    const bonusProgramNoTX = await BonusProgram.findOne({adapter: "test-notx"});
    const spendBonus: SpendBonus =  {
      bonusProgramId: bonusProgramNoTX.id,
      amount: 6.47 
    }

    await Order.check({id: order2.id}, customer, true, undefined,  undefined, spendBonus);
    
    let checkedOrderOnTX = await Order.findOne({id: order2.id});

    expect(checkedOrderOnTX.bonusesTotal).to.equal(6.5);
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
  


  it("order with bonus (with tx)", async () => {
    bonusProgram = (await BonusProgram.update({adapter: "test"}, {enable: true}).fetch())[0];
    await Order.order({id: order1.id})

    let userBP = await UserBonusProgram.findOne({id: UBP});

    expect(userBP.balance).to.equal(100500 - 5.2);
  });

  it("order with bonus (with notx)", async () => {
    await Order.order({id: order2.id})
    let userBP = await UserBonusProgram.findOne({id: UBPnoTX});

    expect(userBP.balance).to.equal(123456 - 6.5);
  });

  // it("check bonus strategies", async () => {

  // });
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
