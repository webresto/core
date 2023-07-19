//import { expect } from "chai";
import { customer } from "../../mocks/customer";
import Maintenance from "../../../models/Maintenance";

describe("Maintenance", function () {

  let dishes:  any;
  let maintenance = {
    id: "maintenance-test",
    title: "test",
    description: "test",
    enable: true,
    startDate: new Date().toISOString(),
    stopDate: new Date(new Date().getTime() + 24 * 60 * 60 * 1000).toISOString(),
  }

  before(async function(){
    dishes = await Dish.find({});
    await Maintenance.create(maintenance).fetch();
  })

  it("get active Maintenance", async function () {
    let maintenance = await Maintenance.getActiveMaintenance()
    if(!maintenance) throw `test maintenance not found`
  });

  it("order should reject when Maintenance", async function () {
    let error = null;
    try {
      let order = await Order.create({id: "test--maintenece"}).fetch();
      await Order.addDish({id: order.id}, dishes[0], 5, [], "", "test");
      await Order.check({id: order.id}, customer, true, undefined, undefined);  
    } catch (e) {
      error = e;
    }

    if(error=== null) throw `Order should stoped`    
  });

  after(async function() {
    await Maintenance.destroy({id: "maintenance-test"}).fetch();
  })
});


