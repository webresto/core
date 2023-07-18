import path = require("path");

describe("RMS adapter", function () {
  this.timeout(60000)
  let rmsAdapter = null
  before(async function() {
    let adapterFile = path.resolve(__dirname, "../../mocks/adapter/RMS");
    rmsAdapter = Adapter.getRMSAdapter(adapterFile, {});
  });

  it("SyncProducts", async () => {
    await rmsAdapter.syncProducts();
    
  });
  
});

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
