import { expect } from "chai";
import type { WorkTime } from "@webresto/worktime";
import { resetDatabase } from "../../support/reset";
import UpdateIsDeletedController from "../../../../lib/adminpanel/src/controller/update-is-deleted";
import UpdateVisibilityController from "../../../../lib/adminpanel/src/controller/update-visibility";
import { stopHoursSweep, sweepHours } from "../../../../lib/hours-sweep";

/**
 * What a storefront shows changed: the events graphql turns into `storefrontChanged`. Every way a write reaches what
 * a storefront shows tells - the switches of the stock manager, a delete for good, the photos, the zones, the ways to
 * pay; what opens and closes by the hours, with no write, is told by the sweep of the hours.
 *
 *   City 1: Kitchen 1 (10:00–20:00 every day), Kitchen 2 (no hours). Group 1: Dish 1.
 *   Zone 1 (no hours: zones have none). Promotion 1 - 10:00–20:00 every day.
 */
describe("Storefront events", function () {
  const EVENTS = [
    "core:product-after-update",
    "core:product-after-destroy",
    "core:group-after-update",
    "core:group-after-destroy",
    "core:selected-media-file-changed",
    "core:place-changed",
    "core:city-changed",
    "core:delivery-zone-changed",
    "core:payment-method-changed",
    "core:promotion-changed",
  ] as const;
  const EVERY_DAY: WorkTime["dayOfWeek"] = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const HOURS: WorkTime[] = [{ dayOfWeek: EVERY_DAY, start: "10:00", stop: "20:00" }];
  const ZONE: [number, number][] = [[9, 9], [11, 9], [11, 11], [9, 11], [9, 9]];

  let told: string[] = [];
  const r: Record<string, any> = {};

  /** the stock manager answers as Express would be asked */
  async function call(controller: (req: any, res: any) => Promise<unknown>, body: Record<string, unknown>) {
    const res = {
      statusCode: 200,
      body: undefined as unknown,
      status(code: number) { this.statusCode = code; return this; },
      json(body: unknown) { this.body = body; return this; },
      sendStatus(code: number) { this.statusCode = code; return this; },
    };
    await controller({ body }, res);
    return res;
  }

  before(async function () {
    // the sweep of the clock would tell between the steps of a test; a test sweeps at the moments it names
    stopHoursSweep();
    await resetDatabase();
    for (const event of EVENTS) emitter.on(event, "storefront-events-test", (...args: unknown[]) => { told.push(`${event} ${(args[0] as { id?: unknown } | undefined)?.id}`); });

    r.city = await City.create({ name: "City 1" }).fetch();
    r.kitchen1 = await Place.create({ title: "Kitchen 1", city: r.city.id, enable: true, isCookingPoint: true, worktime: HOURS as any }).fetch();
    r.kitchen2 = await Place.create({ title: "Kitchen 2", city: r.city.id, enable: true, isCookingPoint: true }).fetch();
    r.group1 = await Group.create({ name: "Group 1", enable: true }).fetch();
    r.dish1 = await Dish.create({ name: "Dish 1", price: 100, enable: true, parentGroup: r.group1.id }).fetch();
    r.zone1 = await DeliveryZone.create({ name: "Zone 1", polygon: ZONE, deliveryCost: 100, minDeliveryTime: 30 } as any).fetch();
    await Promotion.createOrUpdate({
      id: "promotion-1", name: "Promotion 1", badge: "badge-1", description: "Description 1", externalId: "promotion-1",
      isJoint: true, isPublic: true, createdByUser: true, concept: ["origin"], worktime: HOURS,
      configDiscount: { discountType: "flat", discountAmount: 1, dishes: [r.dish1.id], groups: [], excludeModifiers: true },
    } as any);
    await Promotion.update({ id: "promotion-1" }, { enable: true }).fetch();
  });

  after(function () {
    // `emitter.off` does not unsubscribe; a subscriber that does nothing replaces this one.
    for (const event of EVENTS) emitter.on(event, "storefront-events-test", () => undefined);
  });

  beforeEach(function () {
    told = [];
  });

  describe("the switches of the stock manager tell as a form does", function () {
    it("a product switched off and on, deleted and back, hidden", async function () {
      expect((await call(UpdateIsDeletedController, { id: r.dish1.id, model: "dish", enable: false })).body).to.deep.equal({ success: true });
      await call(UpdateIsDeletedController, { id: r.dish1.id, model: "dish", enable: true });
      await call(UpdateIsDeletedController, { id: r.dish1.id, model: "dish", isDeleted: true });
      await call(UpdateIsDeletedController, { id: r.dish1.id, model: "dish", isDeleted: false });
      await call(UpdateVisibilityController, { id: r.dish1.id, model: "dish", visible: false });
      await call(UpdateVisibilityController, { id: r.dish1.id, model: "dish", visible: true });

      expect(told).to.deep.equal(Array(6).fill(`core:product-after-update ${r.dish1.id}`));
      expect(await Dish.findOne({ id: r.dish1.id })).to.include({ enable: true, isDeleted: false, visible: true });
    });

    it("a group deleted and back, hidden", async function () {
      await call(UpdateIsDeletedController, { id: r.group1.id, model: "group", isDeleted: true });
      await call(UpdateIsDeletedController, { id: r.group1.id, model: "group", isDeleted: false });
      await call(UpdateVisibilityController, { id: r.group1.id, model: "group", visible: false });
      await call(UpdateVisibilityController, { id: r.group1.id, model: "group", visible: true });

      expect(told).to.deep.equal(Array(4).fill(`core:group-after-update ${r.group1.id}`));
    });
  });

  it("a delete for good tells: a product, a group, a point, a city", async function () {
    const city = await City.create({ name: "City 2" }).fetch();
    const place = await Place.create({ title: "Kitchen 3", city: city.id, enable: true, isCookingPoint: true }).fetch();
    const group = await Group.create({ name: "Group 2", enable: true }).fetch();
    const dish = await Dish.create({ name: "Dish 2", price: 100, enable: true, parentGroup: group.id }).fetch();
    told = [];

    await Dish.destroy({ id: dish.id }).fetch();
    await Group.destroy({ id: group.id }).fetch();
    await Place.destroy({ id: place.id }).fetch();
    await City.destroy({ id: city.id }).fetch();

    expect(told).to.deep.equal([
      `core:product-after-destroy ${dish.id}`,
      `core:group-after-destroy ${group.id}`,
      `core:place-changed ${place.id}`,
      `core:city-changed ${city.id}`,
    ]);
  });

  it("a photo linked to a product or a group, and unlinked, tells", async function () {
    const photo = await SelectedMediaFile.create({ mediafile_dish: "media-1", dish: r.dish1.id }).fetch();
    await SelectedMediaFile.create({ mediafile_group: "media-2", group: r.group1.id }).fetch();
    await SelectedMediaFile.destroy({ dish: r.dish1.id }).fetch();

    expect(told).to.have.length(3);
    expect(told.every((line) => line.startsWith("core:selected-media-file-changed "))).to.equal(true);
    expect(told[2]).to.equal(`core:selected-media-file-changed ${photo.id}`);
  });

  it("a zone created, changed, deleted tells", async function () {
    const zone = await DeliveryZone.create({ name: "Zone 2", polygon: ZONE, deliveryCost: 100, minDeliveryTime: 30 } as any).fetch();
    // as the zones manager writes it: the row id with the terms
    await DeliveryZone.updateOne({ id: zone.id }, { id: zone.id, deliveryCost: 200 });
    await DeliveryZone.destroy({ id: zone.id }).fetch();

    expect(told).to.deep.equal(Array(3).fill(`core:delivery-zone-changed ${zone.id}`));
  });

  it("a way to pay created, changed, deleted tells", async function () {
    const method = await PaymentMethod.create({ title: "Way 1", type: "promise", adapter: "way-1", enable: true }).fetch();
    await PaymentMethod.updateOne({ id: method.id }, { title: "Way 1 again" });
    await PaymentMethod.destroy({ id: method.id }).fetch();

    expect(told).to.deep.equal(Array(3).fill(`core:payment-method-changed ${method.id}`));
  });

  describe("the sweep of the hours", function () {
    const at = (time: string) => new Date(`2026-08-24T${time}:00`);

    it("tells what opened and what closed since the sweep before, and nothing in between", async function () {
      await sweepHours(at("09:00"));
      expect(told).to.deep.equal([]);

      await sweepHours(at("12:00"));
      const turned = [`core:place-changed ${r.kitchen1.id}`, `core:promotion-changed promotion-1`];
      expect(told).to.have.members(turned).and.have.length(2);

      told = [];
      await sweepHours(at("12:01"));
      expect(told).to.deep.equal([]);

      await sweepHours(at("21:00"));
      expect(told).to.have.members(turned).and.have.length(2);
    });

    it("a record without hours, or switched off, is never told", async function () {
      await Place.updateOne({ id: r.kitchen1.id }, { enable: false });
      await Promotion.update({ id: "promotion-1" }, { enable: false }).fetch();
      await sweepHours(at("09:00"));
      told = [];

      await sweepHours(at("12:00"));
      expect(told).to.deep.equal([]);
    });
  });
});
