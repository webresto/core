import { expect } from "chai";
import RMSAdapter from "../../../../adapters/rms/RMSAdapter";
import { DishRecord } from "../../../../models/Dish";
import { GroupRecord } from "../../../../models/Group";
import { resetDatabase, withSettings } from "../../support/reset";

/**
 * The menu sync of an RMS (`RMSAdapter.syncProducts`) with an RMS for the tests. A dish with variants comes as its RMS
 * gives it - the dish first, with the table of its variants, then the variants with `parentId` - and the hook of the
 * model takes it as it is: no request, no variant marked deleted, and a second sync changes nothing. What the RMS no
 * longer lists is marked deleted at the end of the sync, and no dish of the menu leaves it while the sync runs. The
 * order of the RMS (sortOrder) is written while SYNC_SORT_ORDER is on (by default); off - the order kept here stays.
 *
 *   Group 1: Dish 1 — a box, Size 20 cm (400) and 30 cm (700); Dish 2 — ordinary, 100. Group 2: Dish 3 — ordinary, 300.
 */
describe("RMS sync", function () {
  const SIZE = { key: "size", name: "Size", values: [{ value: 20, title: "20 cm" }, { value: 30, title: "30 cm" }] };
  const ids = { group1: "group-1", group2: "group-2", box: "dish-1", small: "dish-1-20", large: "dish-1-30", dish2: "dish-2", dish3: "dish-3" };

  class TestRms extends RMSAdapter {
    products: Record<string, Partial<DishRecord>[]> = {
      [ids.group1]: [
        {
          id: ids.box, rmsId: "fam:1", name: "Dish 1", price: 0, parentGroup: ids.group1,
          variants: {
            options: [SIZE],
            mappings: [{ values: { size: 20 }, rel: ids.small, isDefault: true }, { values: { size: 30 }, rel: ids.large }],
          },
        },
        { id: ids.small, rmsId: "1-20", name: "Dish 1, 20 cm", price: 400, parentGroup: ids.group1, parentId: ids.box },
        { id: ids.large, rmsId: "1-30", name: "Dish 1, 30 cm", price: 700, parentGroup: ids.group1, parentId: ids.box },
        { id: ids.dish2, rmsId: "2", name: "Dish 2", price: 100, parentGroup: ids.group1 },
      ],
      [ids.group2]: [{ id: ids.dish3, rmsId: "3", name: "Dish 3", price: 300, parentGroup: ids.group2 }],
    };
    groups = [
      { id: ids.group1, rmsId: "g1", name: "Group 1", parentGroup: null },
      { id: ids.group2, rmsId: "g2", name: "Group 2", parentGroup: null },
    ] as unknown as Partial<GroupRecord>[];
    protected async customInitialize() {}
    protected async initialized() {}
    protected async nomenclatureHasUpdated() {
      return true;
    }
    protected async loadNomenclatureTree() {
      return this.groups.map((group) => structuredClone(group)) as GroupRecord[];
    }
    protected async loadProductsByGroup(group: GroupRecord) {
      return (this.products[group.id as string] ?? []).map((product) => structuredClone(product)) as DishRecord[];
    }
    protected async loadOutOfStocksDishes() {
      return [];
    }
    public async createOrder(): Promise<any> {
      throw new Error("not for the tests");
    }
    public async checkOrder(): Promise<any> {
      throw new Error("not for the tests");
    }
    public async api() {
      return null;
    }
  }

  let rms: TestRms;
  const rows = async () =>
    (await Dish.find!({ where: {}, sort: "id ASC" })).map((row: any) => [row.id, row.name, row.price, row.parentId, row.isDeleted, row.variants?.mappings?.map((mapping: any) => mapping.rel) ?? null]);

  before(async function () {
    await resetDatabase();
    // no timers of the sync and no first sync of their own: the tests run it
    await Settings.set!("NO_SYNC_NOMENCLATURE", { value: true } as any);
    await Settings.set!("NO_SYNC_OUT_OF_STOCKS", { value: true } as any);
    rms = new TestRms();
    await Adapter.getRMSAdapter(rms);
    await rms.wait();
  });

  after(function () {
    // the next files place their orders without an RMS, as an installation without one
    (Adapter as any).instanceRMS = undefined;
  });

  it("takes a dish with variants as the RMS gives it, and a second sync changes nothing", async function () {
    await rms.syncProducts(undefined, true);
    const first = await rows();

    expect(first).to.deep.equal([
      [ids.box, "Dish 1", 0, null, false, [ids.small, ids.large]],
      [ids.small, "Dish 1, 20 cm", 400, ids.box, false, null],
      [ids.large, "Dish 1, 30 cm", 700, ids.box, false, null],
      [ids.dish2, "Dish 2", 100, null, false, null],
      [ids.dish3, "Dish 3", 300, null, false, null],
    ]);

    await rms.syncProducts(undefined, true);
    expect(await rows()).to.deep.equal(first);
  });

  it("no dish of the menu leaves it while the sync runs; one the RMS no longer lists leaves at the end", async function () {
    const alive = new Set<string>();
    const seen: string[][] = [];
    emitter.on("rms-sync:before-each-product-item", "rms-sync-test", async () => {
      seen.push((await Dish.find!({ isDeleted: false })).map((row: any) => row.id).sort());
    });
    rms.products[ids.group1] = rms.products[ids.group1].filter((product) => product.id !== ids.dish2);
    try {
      for (const row of await Dish.find!({ isDeleted: false })) alive.add(row.id as string);
      await rms.syncProducts(undefined, true);
    } finally {
      // `emitter.off` does not unsubscribe; a subscriber that does nothing replaces this one
      emitter.on("rms-sync:before-each-product-item", "rms-sync-test", () => undefined);
    }

    expect(seen.length).to.be.greaterThan(0);
    for (const step of seen) expect(step, "the menu during the sync").to.deep.equal([...alive].sort());
    expect(((await Dish.findOne!({ id: ids.dish2 })) as any).isDeleted).to.equal(true);
    expect(((await Dish.findOne!({ id: ids.dish3 })) as any).isDeleted).to.equal(false);
  });

  describe("the order of the menu (SYNC_SORT_ORDER)", function () {
    const order = async () => ({
      dish3: ((await Dish.findOne!({ id: ids.dish3 })) as any).sortOrder,
      group1: ((await Group.findOne!({ id: ids.group1 })) as any).sortOrder,
      group2: ((await Group.findOne!({ id: ids.group2 })) as any).sortOrder,
    });
    /** the RMS gives this order; Dish 3 changes besides it (its price), so the sync writes the dish */
    const rmsOrder = (dish3: number, group1: number, group2: number, price: number) => {
      rms.products[ids.group2] = [{ id: ids.dish3, rmsId: "3", name: "Dish 3", price, parentGroup: ids.group2, sortOrder: dish3 }];
      rms.groups[0].sortOrder = group1;
      rms.groups[1].sortOrder = group2;
    };

    it("on by default: the order of the RMS is written to the dishes and the groups", async function () {
      expect(await Settings.get!("SYNC_SORT_ORDER")).to.equal(true);
      rmsOrder(5, 2, 1, 310);
      await rms.syncProducts(undefined, true);
      expect(await order()).to.deep.equal({ dish3: 5, group1: 2, group2: 1 });
    });

    it("off: the order kept here stays when the RMS changes the dish and gives another order", async function () {
      rmsOrder(5, 2, 1, 310);
      await rms.syncProducts(undefined, true);
      // the operator orders the menu here
      await Dish.update!({ id: ids.dish3 }, { sortOrder: 9 } as any);
      await Group.update!({ id: ids.group1 }, { sortOrder: 7 } as any);
      await Group.update!({ id: ids.group2 }, { sortOrder: 8 } as any);

      await withSettings({ SYNC_SORT_ORDER: false }, async () => {
        rmsOrder(1, 1, 1, 320);
        await rms.syncProducts(undefined, true);
      });

      expect(await order()).to.deep.equal({ dish3: 9, group1: 7, group2: 8 });
      // the rest of the dish is the RMS's still
      expect(((await Dish.findOne!({ id: ids.dish3 })) as any).price).to.equal(320);
    });
  });
});
