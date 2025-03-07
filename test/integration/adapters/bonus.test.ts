import Decimal from "decimal.js";
import { InMemoryBonusProgramAdapter } from "../../mocks/adapter/bonusProgram";
import { expect } from "chai";
import { customer, address } from "../../mocks/customer"
import { SpendBonus } from "../../../interfaces/SpendBonus";
// todo: fix types model instance to {%ModelName%}Record for User";
// todo: fix types model instance to {%ModelName%}Record for Order";
// todo: fix types model instance to {%ModelName%}Record for BonusProgram";
import BonusProgramAdapter from "../../../adapters/bonusprogram/BonusProgramAdapter";
import { OrderRecord } from "../../../models/Order";
import { BonusProgramRecord } from "../../../models/BonusProgram";
import { UserRecord } from "../../../models/User";

let user: UserRecord;
let bp: BonusProgramAdapter;
let bonusProgram: BonusProgramRecord;
let order1: OrderRecord;

let UBP: string;

describe("Bonus program adapter", function () {
  this.timeout(60000)

  before(async function() {
    try {
      var testBA = new InMemoryBonusProgramAdapter();
      
      var testBA_noTransactionsList = new InMemoryBonusProgramAdapter({
        adapter: "test-notx",
        hasGetTransactionsSupport: false
      });
      
      await BonusProgram.alive(testBA);
      
      bonusProgram = (await BonusProgram.update({adapter: "test"},{enable: true}).fetch())[0]

      user = await User.create({ id: "handletestapply-bonus-id", login: "7723555", lastName: 'TESThandleTestApply', firstName: "test", phone: { code: "77", number: "23555" } }).fetch();
      bp = await BonusProgram.getAdapter("test")
      
      UBP = (await UserBonusProgram.registration(user, "test")).id;

      let ubt = await UserBonusTransaction.create({bonusProgram: bp.id, user: user.id, amount: 100500, isNegative: false}).fetch()
      const userBP = await UserBonusProgram.findOne({id: UBP});
    } catch (error) {
      sails.log.error(error)
    }
  });

  it("bonus user must be registered and have balance", async () => {
    const userBP = await UserBonusProgram.findOne({id: UBP});
    expect(userBP.balance).to.equal(100500);
  });

  it("apply bonus in order on check", async () => {
    const dishes = await Dish.find({});
    order1 = await Order.create({id: "test--apply--bonus"}).fetch();
    
    await Order.addDish({id: order1.id}, dishes[0], 5, [], "", "user");
    await Order.addDish({id: order1.id}, dishes[1], 3, [], "", "user");
    const bonusProgram = await BonusProgram.findOne({adapter: "test"});
    const spendBonus: SpendBonus =  {
      bonusProgramId: bonusProgram.id,
      amount: 5.23 // BonusProgram test has 1 decimal 
    }

    await Order.check({id: order1.id}, customer, true, undefined,  undefined, user.id ,spendBonus);
    
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

    let userBP = await UserBonusProgram.findOne({id: UBP});

    expect(userBP.balance).to.equal(100500 - 5.2);
  });


  // it("check bonus strategies", async () => {

  // });
});
