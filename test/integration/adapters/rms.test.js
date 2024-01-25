"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const RMS_1 = require("../../mocks/adapter/RMS");
const adapters_1 = require("../../../adapters");
const chai_1 = require("chai");
const group_generator_1 = __importDefault(require("../../generators/group.generator"));
const dish_generator_1 = __importDefault(require("../../generators/dish.generator"));
describe("RMS adapter", function () {
    this.timeout(60000);
    let rmsAdapter = null;
    before(async function () {
        let adapter = new RMS_1.TestRMS(); ///File = path.resolve(__dirname, "../../mocks/adapter/RMS.js");
        rmsAdapter = await adapters_1.Adapter.getRMSAdapter(adapter);
    });
    it("SyncProducts", async () => {
        // Create dish for check isDelete after sync
        let group = (0, group_generator_1.default)({ parentGroup: null });
        let product = (0, dish_generator_1.default)({
            parentGroup: group.id,
            price: 88,
            name: undefined
        });
        group = await Group.create(group).fetch();
        product = await Dish.create(product).fetch();
        await rmsAdapter.syncProducts();
        let count = await Dish.count({ isDeleted: false });
        console.log(product);
        (0, chai_1.expect)(count).to.equal(616);
        let countGroups = await Group.count({ isDeleted: false });
        (0, chai_1.expect)(countGroups).to.equal(88);
    });
});
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
