import path = require("path");
import { TestRMS } from "../../mocks/adapter/RMS";
import { Adapter } from "../../../adapters";
 import RMSAdapter from "../../../adapters/rms/RMSAdapter"; 
describe("RMS adapter", function () {
  this.timeout(60000)
  let rmsAdapter = null
  before(async function() {
    let adapter  = new TestRMS() ///File = path.resolve(__dirname, "../../mocks/adapter/RMS.js");
    rmsAdapter = await Adapter.getRMSAdapter(adapter);
    console.log(rmsAdapter,999)
  });

  it("SyncProducts", async () => {
    await RMSAdapter.syncProducts();
    let count = await Dish.count({isDeleted: false});
    console.log(count);
  });
  
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
