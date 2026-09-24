import { expect } from "chai";
import dishGenerator from "../../generators/dish.generator";
import { DefaultMenuAdapter } from "../../../adapters/menu/default/defaultMenu";
import { MenuContext, OrderDishId } from "../../../interfaces/Menu";
import { OrderRecord } from "../../../models/Order";
import { DishRecord } from "../../../models/Dish";

describe("Order: countCart writes the menu adapter's line placement", function () {
  this.timeout(10000);

  const kitchens = ["test.route.first", "test.route.second"];
  let realGetAdapter: typeof Menu.getAdapter;

  before(async function () {
    realGetAdapter = Menu.getAdapter;
    for (const id of kitchens) await Place.create!({ id, title: id, isCookingPoint: true, enable: true }).fetch();
  });

  after(async function () {
    Menu.getAdapter = realGetAdapter;
    await Place.destroy!({ id: kitchens }).fetch();
  });

  it("puts two lines on two kitchens and keeps only the kitchens with a line", async function () {
    const soup = await Dish.createOrUpdate(dishGenerator({ name: "route soup", price: 100 }));
    const bread = await Dish.createOrUpdate(dishGenerator({ name: "route bread", price: 50 }));

    /** Soup at the first kitchen, bread at the second; stock is the base's verdict. */
    class TwoKitchens extends DefaultMenuAdapter {
      async placeLines(
        order: OrderRecord,
        lines: { orderDishId: OrderDishId; dish: DishRecord; amount: number }[],
        context: MenuContext,
      ) {
        const placement = await super.placeLines(order, lines, context, null);
        for (const line of lines) {
          const placeId = line.dish.id === soup.id ? kitchens[0] : kitchens[1];
          placement.byOrderDish.set(line.orderDishId, { ...placement.byOrderDish.get(line.orderDishId)!, placeId });
        }
        return { ...placement, placeIds: kitchens, plan: { stops: [], totalMinutes: 0, diagnostics: ["two kitchens"] } };
      }
    }
    const adapter = new TwoKitchens();
    Menu.getAdapter = async () => adapter;

    const order = await Order.create!({ id: "test.order.place-lines" }).fetch();

    await Order.addDish({ id: order.id }, soup, 1, [], "", "user");
    // Nothing is cooked at the second kitchen yet, so the order does not name it.
    expect((await Order.findOne!({ id: order.id })).cookingPoints).to.deep.equal([kitchens[0]]);

    await Order.addDish({ id: order.id }, bread, 1, [], "", "user");
    expect((await Order.findOne!({ id: order.id })).cookingPoints).to.deep.equal(kitchens);

    const lines = await OrderDish.find!({ order: order.id });
    const placeOf = (dish: DishRecord) => lines.find((line) => line.dish === dish.id)?.cookingPoint;
    expect(placeOf(soup)).to.equal(kitchens[0]);
    expect(placeOf(bread)).to.equal(kitchens[1]);
  });
});
