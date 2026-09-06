"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const RMS_1 = require("../../mocks/adapter/RMS");
const adapters_1 = require("../../../adapters");
const chai_1 = require("chai");
describe("RMS adapter", function () {
    this.timeout(60000);
    let rmsAdapter = null;
    before(async function () {
        let adapter = new RMS_1.TestRMS(); ///File = path.resolve(__dirname, "../../mocks/adapter/RMS.js");
        rmsAdapter = await adapters_1.Adapter.getRMSAdapter(adapter);
    });
    it("SyncProducts", async () => {
        await rmsAdapter.syncProducts();
        let countGroups = await Group.count({ isDeleted: false });
        (0, chai_1.expect)(countGroups).to.equal(88);
        let count = await Dish.count({ isDeleted: false });
        (0, chai_1.expect)(count).to.equal(616);
    });
});
function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
