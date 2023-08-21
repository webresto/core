import path = require("path");
import { TestRMS } from "../../mocks/adapter/RMS";
import { Adapter } from "../../../adapters"; 
import { expect } from "chai";


describe("RMS adapter", function () {
  this.timeout(60000)
  let rmsAdapter = null
  before(async function() {
    let adapter  = new TestRMS() ///File = path.resolve(__dirname, "../../mocks/adapter/RMS.js");
    rmsAdapter = await Adapter.getRMSAdapter(adapter);
  });

  it("SyncProducts", async () => {
    await rmsAdapter.syncProducts();
    let countGroups = await Group.count({isDeleted: false})
    expect(countGroups).to.equal(88);  
    let count = await Dish.count({isDeleted: false});
    expect(count).to.equal(616)
  });
  
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
