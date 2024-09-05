"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bonusProgram_1 = require("../../mocks/adapter/bonusProgram");
const chai_1 = require("chai");
const customer_1 = require("../../mocks/customer");
const User_1 = __importDefault(require("../../../models/User"));
const Order_1 = __importDefault(require("../../../models/Order"));
const BonusProgram_1 = __importDefault(require("../../../models/BonusProgram"));
let user;
let bp;
let bonusProgram;
let bonusProgramNoTx;
let order1;
let order2;
let UBP;
describe("Bonus program adapter", function () {
    this.timeout(60000);
    before(async function () {
        try {
            var testBA = new bonusProgram_1.InMemoryBonusProgramAdapter();
            var testBA_noTransactionsList = new bonusProgram_1.InMemoryBonusProgramAdapter({
                adapter: "test-notx",
                hasGetTransactionsSupport: false
            });
            await BonusProgram_1.default.alive(testBA);
            bonusProgram = (await BonusProgram_1.default.update({ adapter: "test" }, { enable: true }).fetch())[0];
            user = await User_1.default.create({ id: "handletestapply-bonus-id", login: "7723555", lastName: 'TESThandleTestApply', firstName: "test", phone: { code: "77", number: "23555" } }).fetch();
            bp = await BonusProgram_1.default.getAdapter("test");
            UBP = (await UserBonusProgram.registration(user, "test")).id;
            let ubt = await UserBonusTransaction.create({ bonusProgram: bp.id, user: user.id, amount: 100500, isNegative: false, balanceAfter: 100500 }).fetch();
            const userBP = await UserBonusProgram.findOne({ id: UBP });
        }
        catch (error) {
            console.error(error);
        }
    });
    it("bonus user must be registered and have balance", async () => {
        const userBP = await UserBonusProgram.findOne({ id: UBP });
        (0, chai_1.expect)(userBP.balance).to.equal(100500);
    });
    it("apply bonus in order on check", async () => {
        const dishes = await Dish.find({});
        order1 = await Order_1.default.create({ id: "test--apply--bonus" }).fetch();
        await Order_1.default.addDish({ id: order1.id }, dishes[0], 5, [], "", "user");
        await Order_1.default.addDish({ id: order1.id }, dishes[1], 3, [], "", "user");
        const bonusProgram = await BonusProgram_1.default.findOne({ adapter: "test" });
        const spendBonus = {
            bonusProgramId: bonusProgram.id,
            amount: 5.23 // BonusProgram test has 1 decimal 
        };
        await Order_1.default.check({ id: order1.id }, customer_1.customer, true, undefined, undefined, user.id, spendBonus);
        let checkedOrder = await Order_1.default.findOne({ id: order1.id });
        (0, chai_1.expect)(checkedOrder.bonusesTotal).to.equal(5.2);
    });
    it("check disable bonus program", async () => {
        bonusProgram = (await BonusProgram_1.default.update({ adapter: "test" }, { enable: false }).fetch())[0];
        let error = null;
        try {
            await Order_1.default.order({ id: order1.id });
        }
        catch (e) {
            error = e;
        }
        (0, chai_1.expect)(error).to.not.be.null;
    });
    it("order with bonus", async () => {
        bonusProgram = (await BonusProgram_1.default.update({ adapter: "test" }, { enable: true }).fetch())[0];
        await Order_1.default.order({ id: order1.id });
        let userBP = await UserBonusProgram.findOne({ id: UBP });
        (0, chai_1.expect)(userBP.balance).to.equal(100500 - 5.2);
    });
    // it("check bonus strategies", async () => {
    // });
});
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
