import path = require("path");
import { TestRMS } from "../../mocks/adapter/RMS";
import { Adapter } from "../../../adapters"; 
import { expect } from "chai";
import groupGenerator from "../../generators/group.generator";
import dishGenerator from "../../generators/dish.generator";
import RMSAdapter from "../../../adapters/rms/RMSAdapter";


describe("RMS adapter", function () {
  this.timeout(60000)
  let rmsAdapter: RMSAdapter = null
  before(async function() {
    let adapter  = new TestRMS() ///File = path.resolve(__dirname, "../../mocks/adapter/RMS.js");
    rmsAdapter = await Adapter.getRMSAdapter(adapter);
  });

  it("SyncProducts", async () => {


    // Create dish for check isDelete after sync
    let group = groupGenerator({ parentGroup: null });
    let product = dishGenerator({
      parentGroup: group.id,
      price: 88,
      name: undefined
    })
    group = await Group.create(group).fetch();
    product = await Dish.create(product).fetch();

    await rmsAdapter.syncProducts();
    
    let count = await Dish.count({isDeleted: false});
    expect(count).to.equal(616)
    let groups = await Group.find({isDeleted: false})
    const countGroups = groups.length
    expect(countGroups).to.equal(88); 


    // Should delete unknown products
    let unknownProduct = dishGenerator({
      parentGroup: groups[0].id,
      price: 100,
      name: "Unknown product"
    })
    product = await Dish.create(unknownProduct).fetch();
    count = await Dish.count({isDeleted: false});
    expect(count).to.equal(617)
    await rmsAdapter.syncProducts();
    count = await Dish.count({isDeleted: false});
    expect(count).to.equal(616)
  });
  
});
