/** Snapshot of a working development catalog, taken by `scripts/dump-dev-catalog.js`. */
interface CatalogRow {
  id: string;
  parentGroup?: string;
  [key: string]: unknown;
}
const devCatalog = require("./fixtures/dev-catalog.json") as {
  groups: CatalogRow[];
  dishes: CatalogRow[];
};

/**
 * `true` creates whatever is missing and leaves everything else alone.
 * `recreate` drops the entities this seed owns and writes them again, which is
 * how a development database is reset now that boot-time normalization is gone.
 */
type SeedMode = "off" | "create-missing" | "recreate";

function readSeedMode(): SeedMode {
  const value = String(process.env.MULTI_KITCHEN_DEMO_SEED || "").trim().toLowerCase();
  if (value === "recreate") return "recreate";
  if (value === "true") return "create-missing";
  return "off";
}

async function createIfMissing(model: any, where: any, values: any): Promise<any> {
  const existing = await model.findOne({ where });
  if (existing) return existing;
  await model.create(values);
  return model.findOne({ where });
}

/**
 * Writes the catalog fixture: the groups and products a development database
 * needs to look like a real menu.
 *
 * The fixture is a snapshot of a working development catalog, taken by
 * `scripts/dump-dev-catalog.js`. It is the whole point of the seed growing:
 * `sails-disk` never runs migrations, so a fresh development database used to
 * come up empty and there was nothing to try the Stock Manager on.
 */
async function seedCatalog(recreate: boolean): Promise<void> {
  const groups = devCatalog.groups ?? [];
  const dishes = devCatalog.dishes ?? [];

  if (recreate) {
    const groupIds = groups.map((group: any) => group.id);
    const dishIds = dishes.map((dish: any) => dish.id);
    if (dishIds.length) await Dish.destroy({ id: { in: dishIds } }).fetch();
    if (groupIds.length) await Group.destroy({ id: { in: groupIds } }).fetch();
  }

  // Parents first, so a nested group never points at a row that is not there yet.
  for (const group of groups) {
    const { parentGroup, ...values } = group;
    await createIfMissing(Group, { id: group.id }, values);
  }
  for (const group of groups) {
    if (!group.parentGroup) continue;
    await Group.update({ id: group.id }, { parentGroup: group.parentGroup }).fetch();
  }

  for (const dish of dishes) {
    await createIfMissing(Dish, { id: dish.id }, dish);
  }
}

/**
 * One promotion, applying to every basket.
 *
 * There used to be a pair here, differing only in whether they named a delivery
 * zone — the point being to compare a restricted promotion against an
 * unrestricted one. Promotions are targeted by menu alone now, so the
 * restriction has no counterpart left and the pair collapses to one.
 *
 * `isJoint: true` so it can be seen alongside others, and it discounts the whole
 * basket by a percentage so the effect is visible on any cart.
 */
const PROMOTIONS = [
  {
    id: "demo-promo-everywhere",
    externalId: "demo-promo-everywhere",
    name: "Demo: 5% everywhere",
    badge: "demo-any-zone",
    description: "Applies to every basket.",
    discountAmount: 5,
  },
] as const;

async function seedPromotions(recreate: boolean): Promise<void> {
  if (recreate) {
    await Promotion.destroy({ id: { in: PROMOTIONS.map((promotion) => promotion.id) } }).fetch();
  }

  for (const promotion of PROMOTIONS) {
    // `createOrUpdate` rather than `createIfMissing`: `hash` is required and this
    // is the only place that computes it. It also re-registers the handler when
    // the definition changes, which a plain create would not.
    await Promotion.createOrUpdate({
      id: promotion.id,
      externalId: promotion.externalId,
      name: promotion.name,
      badge: promotion.badge,
      description: promotion.description,
      // `createdByUser` makes the adapter build a ConfiguredPromotion handler for
      // it at lift; without it the row exists and nothing ever applies it.
      createdByUser: true,
      enable: true,
      isPublic: true,
      isJoint: true,
      isDeleted: false,
      concept: ["origin"],
      sortOrder: 100,
      configDiscount: {
        discountType: "percentage",
        discountAmount: promotion.discountAmount,
        // Both wildcards, and neither may be `null`.
        //
        // `condition()` accepts a dish match *or* a group match, but
        // `applyPromotion()` requires both, and it reads `config.groups` without
        // a null guard — so `groups: null` throws inside the discount loop, the
        // promotion is silently skipped, and the result is indistinguishable
        // from a zone rule that refused it. `["*"]` is how "any basket" is
        // spelled here.
        dishes: ["*"],
        groups: ["*"],
      },
    });

    // `Promotion.beforeCreate` overwrites `enable` from `PROMOTION_ENABLE_BY_DEFAULT`,
    // which is `false` out of the box — so a promotion created here arrives switched
    // off no matter what was passed in. A demo promotion nobody can see demonstrates
    // nothing, so it is enabled explicitly, after the fact.
    const saved = (await Promotion.update({ id: promotion.id }, { enable: true }).fetch())[0];

    // Registering the handler here rather than waiting for the next boot: the
    // `lifted` listener that builds handlers has already run by the time this seed
    // does, so without this the promotions would only start applying on restart.
    if (saved) Adapter.getPromotionAdapter().recreateConfiguredPromotionHandler(saved);
  }
}

/**
 * The settings the scenarios are written against.
 *
 * Written every time the seed runs, not only on a recreate: a scenario that
 * depends on soft calculation being on cannot start by asking the operator
 * whether it is. The geocoder URL is deliberately not among them — it belongs to
 * the installation, and pointing a real one at a test instance is not a demo
 * decision.
 */
async function seedSettings(): Promise<void> {
  // Zones first, so an address inside one is priced by it; the straight-line
  // fallback follows, and a single point answers when there is nothing else.
  await Settings.set("KITCHEN_RESOLVE_CHAIN", {
    key: "KITCHEN_RESOLVE_CHAIN",
    value: ["delivery-zone", "nearest-geo", "single-point"],
  } as any);

  // The storefront asks for an address or a pickup point before the first
  // product goes into the basket, which is where the menu starts being read at
  // one kitchen. Without this the popup never opens and the whole demo is a
  // single global menu.
  await Settings.set("FIELDS_FOR_ORDER_INITIALIZATION", {
    key: "FIELDS_FOR_ORDER_INITIALIZATION",
    value: ["address", "pickupPoint"],
  } as any);

  await Settings.set("MENU_PLACE_BASED_MODE", {
    key: "MENU_PLACE_BASED_MODE",
    value: "default",
  } as any);

  // No cap on how far `nearest-geo` may reach: an address outside every zone
  // still gets a kitchen, and what happens next is the soft calculation's
  // answer rather than "no kitchen". `type` is spelled out because `0` is
  // falsy and the setting would otherwise be saved without one.
  await Settings.set("DELIVERY_MAX_RADIUS_KM", {
    key: "DELIVERY_MAX_RADIUS_KM",
    type: "number",
    value: 0,
  } as any);

  // An address the calculation cannot price is taken anyway, with a message —
  // scenarios 05 and 06 read that message.
  await Settings.set("SOFT_DELIVERY_CALCULATION", {
    key: "SOFT_DELIVERY_CALCULATION",
    value: true,
  } as any);

  // Round the clock, because the scenarios run at whatever hour they run.
  // The default 10:00–20:00 makes the checkout offer "as soon as possible" and
  // "for a time" only during the day, so scenario 10 passed in the afternoon and
  // failed at night — on a stand where nothing had changed. Closing a *point* is
  // still tested, deliberately, by scenarios 03 and 07 through `Place.worktime`.
  await Settings.set("WORK_TIME", {
    key: "WORK_TIME",
    value: [{
      dayOfWeek: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
      start: "00:00",
      stop: "23:59",
    }],
  } as any);
}

/**
 * Fills a development database with a usable catalog, one promotion and the
 * settings the scenarios expect.
 *
 * Cities, kitchens, zones and addresses are not here: an operator creates them
 * in scenario 01, from the fixtures in
 * `dev-docs/Сквозной-сценарий/fixtures/`.
 *
 * Driven by `MULTI_KITCHEN_DEMO_SEED`: `true` adds what is missing and never
 * overwrites anything, `recreate` first deletes the entities the seed owns.
 * Anything else leaves the database untouched.
 */
export async function seedMultiKitchenDemo(): Promise<void> {
  const mode = readSeedMode();
  if (mode === "off") return;

  const recreate = mode === "recreate";
  if (recreate) {
    sails.log.warn("[MultiKitchen demo] recreate mode: the seeded catalog and promotions are dropped first");
  }

  await seedCatalog(recreate);
  await seedPromotions(recreate);
  await seedSettings();

  const groups = devCatalog.groups?.length ?? 0;
  const dishes = devCatalog.dishes?.length ?? 0;
  sails.log.info(
    `[MultiKitchen demo] Seeded ${groups} catalog groups, ${dishes} catalog products ` +
    `and ${PROMOTIONS.length} promotions. ` +
    `Cities, kitchens, zones and addresses are the operator's to create.`,
  );
}
