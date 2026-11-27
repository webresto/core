import { expect } from "chai";
import RMSAdapter from "../../../../adapters/rms/RMSAdapter";
import { resetDatabase } from "../../support/reset";
import { add, checkout, newBasket, pickUpAt, thrown } from "../../support/storefront";

/**
 * The RMS of the installation and an order: the checkout asks it (`checkOrder`) on the counted order, its "no" stops
 * the checkout with its words (code 30), no answer does not; placing sends it the order (`createOrder`) and keeps its
 * id and number, and an RMS that does not take it leaves the order placed and a problem. Without an RMS the order is
 * placed here alone, nothing is asked and nothing is a problem.
 *
 *   City 1: Kitchen 1 (pickup); Dish 1, 100.
 */
describe("Checkout: the RMS of the order", function () {
  let kitchen1: string;
  let dish1: string;

  class TestRms extends RMSAdapter {
    check: () => Promise<any> = async () => ({ allowed: true });
    create: (order: any) => Promise<any> = async (order) => ({ ...order, rmsId: "rms-1", rmsOrderNumber: "5975", rmsOrderData: { status: "accepted" } });
    checked: any[] = [];
    protected async customInitialize() {}
    protected async initialized() {}
    protected async nomenclatureHasUpdated() {
      return false;
    }
    protected async loadNomenclatureTree() {
      return [];
    }
    protected async loadProductsByGroup() {
      return [];
    }
    protected async loadOutOfStocksDishes() {
      return [];
    }
    public async checkOrder(order: any): Promise<any> {
      this.checked.push(order);
      return this.check();
    }
    public async createOrder(order: any): Promise<any> {
      return this.create(order);
    }
    public async api() {
      return null;
    }
  }
  let rms: TestRms;

  before(async function () {
    await resetDatabase();
    // no timers of the sync and no first sync of its own
    await Settings.set!("NO_SYNC_NOMENCLATURE", { value: true } as any);
    await Settings.set!("NO_SYNC_OUT_OF_STOCKS", { value: true } as any);
    const city = await City.create!({ name: "City 1" }).fetch();
    kitchen1 = (await Place.create!({ title: "Kitchen 1", city: city.id, coordinate: { lat: 10, lon: 10 }, enable: true, isCookingPoint: true, isPickupPoint: true }).fetch()).id as string;
    const group = await Group.create!({ name: "Group 1", enable: true }).fetch();
    dish1 = (await Dish.create!({ name: "Dish 1", price: 100, enable: true, parentGroup: group.id }).fetch()).id as string;
  });

  afterEach(function () {
    (Adapter as any).instanceRMS = undefined;
  });

  /** a pickup basket of Dish 1 at Kitchen 1 */
  async function basket(): Promise<string> {
    const id = await newBasket();
    await pickUpAt(id, kitchen1);
    await add(id, dish1);
    return id;
  }
  async function withRms(): Promise<TestRms> {
    rms = new TestRms();
    await Adapter.getRMSAdapter(rms);
    await rms.wait();
    return rms;
  }

  it("asks the RMS at the checkout, on the counted order", async function () {
    await withRms();
    const id = await basket();

    expect(await thrown(checkout(id))).to.equal(null);
    expect(rms.checked.map((order) => [order.id, order.total])).to.deep.equal([[id, 100]]);
    expect((await Order.findOne!({ id })).state).to.equal("CHECKOUT");
  });

  it("stops the checkout with the words of the RMS when it refuses", async function () {
    (await withRms()).check = async () => ({ allowed: false, message: "Dish 1 is over" });
    const id = await basket();

    expect(await thrown(checkout(id))).to.deep.equal({ code: 30, error: "Dish 1 is over" });
    expect((await Order.findOne!({ id })).state).to.not.equal("CHECKOUT");
  });

  it("does not stop the checkout when the RMS does not answer", async function () {
    (await withRms()).check = async () => {
      throw new Error("timeout");
    };
    const id = await basket();

    expect(await thrown(checkout(id))).to.equal(null);
    expect((await Order.findOne!({ id })).state).to.equal("CHECKOUT");
  });

  it("keeps the id and the number the RMS gives the placed order", async function () {
    await withRms();
    const id = await basket();
    await checkout(id);
    await Order.order({ id });

    expect(await Order.findOne!({ id })).to.deep.include({ state: "ORDER", rmsId: "rms-1", rmsOrderNumber: "5975", problem: false });
  });

  it("places an order the RMS does not take, as a problem", async function () {
    (await withRms()).create = async () => {
      throw new Error("ERP is down");
    };
    const id = await basket();
    await checkout(id);
    await Order.order({ id });

    expect(await Order.findOne!({ id })).to.deep.include({ state: "ORDER", problem: true, rmsErrorMessage: "ERP is down" });
  });

  it("places an order without an RMS as it is: nothing asked, no problem", async function () {
    const id = await basket();
    await checkout(id);
    await Order.order({ id });

    const order = await Order.findOne!({ id });
    expect(order).to.deep.include({ state: "ORDER", problem: false });
    // an empty string attribute reads as "" here
    expect(order.rmsErrorCode || null).to.equal(null);
  });
});
