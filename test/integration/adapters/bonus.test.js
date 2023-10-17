"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const bonusProgram_1 = require("../../mocks/adapter/bonusProgram");
const chai_1 = require("chai");
const customer_1 = require("../../mocks/customer");
let user;
let bp;
let bonusProgram;
let bonusProgramNoTx;
let order1;
let order2;
describe("bonus program adapter (with transaction support)", function () {
    this.timeout(60000);
    before(async function () {
        try {
            var testBA = new bonusProgram_1.InMemoryBonusProgramAdapter();
            var testBA_noTransactionsList = new bonusProgram_1.InMemoryBonusProgramAdapter({
                adapter: "test-notx",
                hasGetTransactionsSupport: false
            });
            // Add both transactions
            await BonusProgram.alive(testBA);
            await BonusProgram.alive(testBA_noTransactionsList);
            bonusProgram = (await BonusProgram.update({ adapter: "test" }, { enable: true }).fetch())[0];
            bonusProgramNoTx = (await BonusProgram.update({ adapter: "test-notx" }, { enable: true }).fetch())[0];
            user = await User.create({ id: "handletestapply-bonus-id", login: "7723555", lastName: 'TESThandleTestApply', firstName: "test", phone: { code: "77", number: "23555" } }).fetch();
            bp = await BonusProgram.getAdapter("test");
            await UserBonusProgram.registration(user, "test");
            await UserBonusProgram.registration(user, "test-notx");
            await UserBonusTransaction.create({ bonusProgram: bp.id, user: user.id, isStable: true, amount: 100500, isNegative: false }).fetch();
            await UserBonusTransaction.create({ bonusProgram: bp.id, user: user.id, isStable: true, amount: 123456, isNegative: false }).fetch();
        }
        catch (error) {
            console.error(error);
        }
    });
    it("bonus user must be registered and have balance", async () => {
        const userBP = await UserBonusProgram.find({ user: user.id });
        console.log(userBP);
        (0, chai_1.expect)(userBP[0].balance + userBP[1].balance).to.equal(100500 + 123456);
    });
    it("apply bonus in order on check (with tx)", async () => {
        const dishes = await Dish.find({});
        order1 = await Order.create({ id: "test--apply--bonus", user: user.id }).fetch();
        await Order.addDish({ id: order1.id }, dishes[0], 5, [], "", "user");
        await Order.addDish({ id: order1.id }, dishes[1], 3, [], "", "user");
        const bonusProgram = await BonusProgram.findOne({ adapter: "test" });
        const spendBonus = {
            bonusProgramId: bonusProgram.id,
            amount: 5.23 // BonusProgram test has 1 decimal 
        };
        await Order.check({ id: order1.id }, customer_1.customer, true, undefined, undefined, spendBonus);
        let checkedOrder = await Order.findOne({ id: order1.id });
        (0, chai_1.expect)(checkedOrder.bonusesTotal).to.equal(5.2);
    });
    it("apply bonus in order on check (with notx)", async () => {
        const dishes = await Dish.find({});
        order2 = await Order.create({ id: "test--apply--bonus-notx", user: user.id }).fetch();
        await Order.addDish({ id: order2.id }, dishes[0], 5, [], "", "user");
        await Order.addDish({ id: order2.id }, dishes[1], 3, [], "", "user");
        const bonusProgramNoTX = await BonusProgram.findOne({ adapter: "test-notx" });
        const spendBonus = {
            bonusProgramId: bonusProgramNoTX.id,
            amount: 6.47
        };
        await Order.check({ id: order2.id }, customer_1.customer, true, undefined, undefined, spendBonus);
        let checkedOrderOnTX = await Order.findOne({ id: order2.id });
        (0, chai_1.expect)(checkedOrderOnTX.bonusesTotal).to.equal(6.5);
    });
    it("check disable bonus program", async () => {
        bonusProgram = (await BonusProgram.update({ adapter: "test" }, { enable: false }).fetch())[0];
        let error = null;
        try {
            await Order.order({ id: order1.id });
        }
        catch (e) {
            error = e;
        }
        (0, chai_1.expect)(error).to.not.be.null;
    });
    it("order with bonus (with tx)", async () => {
        bonusProgram = (await BonusProgram.update({ adapter: "test" }, { enable: true }).fetch())[0];
        await Order.order({ id: order1.id });
        let userBP = await UserBonusProgram.findOne({ user: user.id });
        (0, chai_1.expect)(userBP.balance).to.equal(100500 - 5.2);
    });
    it("order with bonus (with notx)", async () => {
        await Order.order({ id: order2.id });
        let userBP = await UserBonusProgram.findOne({ user: user.id });
        (0, chai_1.expect)(userBP.balance).to.equal(123456 - 6.5);
    });
    // it("check bonus strategies", async () => {
    // });
});
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
