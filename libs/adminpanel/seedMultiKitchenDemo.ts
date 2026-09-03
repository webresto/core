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

const DEMO_PASSWORD = process.env.MULTI_KITCHEN_DEMO_PASSWORD || "stock-demo-2026";

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

const PLACES = [
  {
    id: "demo-kitchen-center",
    title: "Demo kitchen: Center",
    address: "Екатеринбург, улица Малышева, 44",
    coordinate: { lat: 56.8371, lng: 60.6019 },
    // Also a pickup point, so the storefront's self-service tab has something in
    // it. Pickup points are not a separate model: a Place carries both flags and
    // may cook and hand orders over at once.
    isPickupPoint: true,
  },
  {
    id: "demo-kitchen-north",
    title: "Demo kitchen: North",
    address: "Екатеринбург, проспект Космонавтов, 41",
    coordinate: { lat: 56.8907, lng: 60.6103 },
    isPickupPoint: false,
  },
] as const;

/**
 * The cities the demo is set in.
 *
 * The stand carried two invented cities for a while, to show that synchronising
 * one leaves the other's zones alone; they were dropped because every address
 * used to be qualified with the single `CITY` setting and a second city's
 * addresses resolved into the first one. That is fixed — the city now travels
 * with the address — so the three below are a demo-content decision rather than
 * a workaround.
 *
 * Yekaterinburg is the hand-drawn one: the storefront design is set there, the
 * geocoder answers for it, and its only zone is drawn locally with no source at
 * all. The other two are empty on purpose — they exist to have a real Google My
 * Maps link pasted into them, one document keeping every zone in a single
 * folder and one grouping them into three, which is both shapes a layer import
 * can arrive in.
 *
 * The links are not written here. They are an operator's to paste, and a seed
 * that filled them in would be answering the question the page exists to ask.
 * A reseed forgets the ones that were pasted, which is what keeps the field
 * empty on the second run as well as the first.
 */
const CITIES = [
  { id: "demo-city-ekaterinburg", name: "Екатеринбург", slug: "ekaterinburg" },
  { id: "demo-city-tyumen", name: "Тюмень", slug: "tyumen" },
  { id: "demo-city-nhatrang", name: "Нячанг", slug: "nha-trang" },
] as const;

/**
 * Ids this seed used to create and no longer does.
 *
 * A seed only ever deletes what it knows the ids of, so renaming a demo entity
 * strands the previous one: it stops being recreated and stops being cleaned up,
 * and it sits in the database looking like something an operator made. Anything
 * dropped from the lists above belongs here instead of just disappearing.
 */
const RETIRED_CITY_IDS = ["demo-city", "demo-city-1", "demo-city-2"];
const RETIRED_ZONE_IDS = ["demo-zone-center", "demo-zone-north"];

/**
 * One locally drawn zone.
 *
 * Local means no `source` and no `externalId`: nothing synchronises it, nothing
 * locks it, and every field including the polygon is the operator's. It exists
 * next to the zones that arrive from the KML fixture so both states are on one
 * screen — the difference between a zone you may reshape and one you may only
 * price is otherwise hard to believe until you meet it.
 *
 * It is also the only zone here bound to a kitchen. Zones from a source arrive
 * without one, which is normal: a document knows about shapes, not about
 * kitchens, and binding them is the operator's job.
 */
const ZONES = [
  {
    id: "demo-zone-local",
    name: "Demo zone: local (centre and east)",
    description: "Drawn here, not imported. Everything about it is editable.",
    city: "demo-city-ekaterinburg",
    // Listed before the imported zones so an overlap resolves in its favour,
    // which is what makes the "first hit wins" rule visible.
    sortOrder: 1,
    minDeliveryTime: 45,
    minOrderTotal: 500,
    freeDeliveryFrom: 2000,
    deliveryCost: 200,
    deliveryMessage: "Delivery in the local zone",
    // Yekaterinburg, centre and east. Covers Gagarina 76, the address the
    // storefront design uses, so the whole path can be walked with a real one.
    polygon: [
      [60.58, 56.80],
      [60.70, 56.80],
      [60.70, 56.88],
      [60.58, 56.88],
      [60.58, 56.80],
    ],
  },
] as const;

/**
 * `type` and the cooking times are here to make the delivery estimate visible.
 *
 * Only a `dish` is cooked, so the bottled drink carries a type of `product` and
 * no times: a basket of it alone must quote the road and nothing else. The pizza
 * has the widest range so the promise is plainly an interval rather than a
 * number, and the dessert has none at all — a cooked product nobody has timed
 * contributes nothing rather than a guess, and that state needs to be on the
 * stand too.
 */
const PRODUCTS = [
  { id: "demo-product-pizza", name: "Demo Pizza", code: "DEMO-PIZZA", price: 550, type: "dish", cookingTimeMax: 35 },
  { id: "demo-product-soup", name: "Demo Soup", code: "DEMO-SOUP", price: 250, type: "dish", cookingTimeMax: 20 },
  { id: "demo-product-dessert", name: "Demo Dessert", code: "DEMO-DESSERT", price: 190, type: "dish" },
  // Deliberately absent from BALANCES: it demonstrates the default state where a
  // product has no DishPlace row and is therefore unlimited at every point.
  { id: "demo-product-everywhere", name: "Demo Everywhere", code: "DEMO-EVERYWHERE", price: 120, type: "product" },
] as const;

const CATALOG_GROUP_ID = "demo-stock-group";

/**
 * Rows exist only where a source actually supplied a value. `null` means the
 * source said nothing, and a missing pair means the product is unlimited there.
 *
 * Every pair below survives the emptiness rule on purpose: a row whose balances
 * are all `null` or `-1` while `enable` is `true` limits nothing, so it would be
 * deleted the moment it was written. That state is demonstrated by the absence
 * of a row (see `demo-product-everywhere`), which is what it actually means.
 */
const BALANCES: Record<string, Record<string, { localBalance?: number | null; rmsBalance?: number | null; enable?: boolean }>> = {
  "demo-kitchen-center": {
    // Both sources known: `minimum` mode shows 3, `rms-only` shows 8.
    "demo-product-pizza": { localBalance: 3, rmsBalance: 8 },
    // Operator pressed ∞, RMS still limits it: the row stays and `minimum` shows 2.
    "demo-product-soup": { localBalance: -1, rmsBalance: 2 },
    // Equal values: `minimum` mode hides the RMS and effective rows in the UI.
    "demo-product-dessert": { localBalance: 4, rmsBalance: 4 },
  },
  "demo-kitchen-north": {
    // Local stop at one point only.
    "demo-product-pizza": { localBalance: 0, rmsBalance: 5 },
    // RMS only: no operator value at this point.
    "demo-product-soup": { rmsBalance: 1 },
    // Disabled by the operator: a hard stop that wins over both balances and
    // keeps the row alive no matter what the balances say.
    "demo-product-dessert": { localBalance: 2, rmsBalance: 6, enable: false },
  },
};

/**
 * Bumped when the demo values themselves change. The stock rows are rewritten
 * once per version so a new layout actually lands, and are left alone on later
 * boots so manual edits made while testing the UI survive a restart.
 */
const DEMO_BALANCES_VERSION = "2026-08-19-empty-row-rule";
const DEMO_BALANCES_VERSION_KEY = "MULTI_KITCHEN_DEMO_BALANCES_VERSION";

async function createIfMissing(model: any, where: any, values: any): Promise<any> {
  const existing = await model.findOne({ where });
  if (existing) return existing;
  await model.create(values);
  return model.findOne({ where });
}

async function ensureDemoAdminGroup(model: any, name: string, description: string, placeId: string): Promise<any> {
  const tokenGrant = { tokenId: "stock-manager", rights: [placeId] };
  const existing = await model.findOne({ where: { name } });
  if (!existing) {
    return model.create({ name, description, tokens: ["access-to-adminpanel", tokenGrant] });
  }

  const tokens = Array.isArray(existing.tokens) ? existing.tokens : [];
  const hasLogin = tokens.includes("access-to-adminpanel");
  const hasStockGrant = tokens.some((token: any) => token?.tokenId === "stock-manager");
  if (!hasLogin || !hasStockGrant) {
    await model.updateOne(
      { where: { name } },
      { tokens: [...tokens, ...(!hasLogin ? ["access-to-adminpanel"] : []), ...(!hasStockGrant ? [tokenGrant] : [])] },
    );
  }
  return model.findOne({ where: { name } });
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

/** The demo places, products and stock rows the Stock Manager screenshots use. */
async function seedStockDemo(recreate: boolean): Promise<void> {
  const demoProductIds = PRODUCTS.map((product) => product.id);

  if (recreate) {
    await DishPlace.destroy({ dish: { in: demoProductIds } }).fetch();
    await Dish.destroy({ id: { in: demoProductIds } }).fetch();
    await Group.destroy({ id: CATALOG_GROUP_ID }).fetch();
    await Place.destroy({ id: { in: PLACES.map((place) => place.id) } }).fetch();
  }

  for (const place of PLACES) {
    await createIfMissing(Place, { id: place.id }, {
      enable: true,
      isCookingPoint: true,
      isSalePoint: true,
      ...place,
    });
  }

  const catalogGroup = await createIfMissing(Group, { id: CATALOG_GROUP_ID }, {
    id: CATALOG_GROUP_ID,
    name: "Demo stock catalog",
    enable: true,
    isDeleted: false,
  });

  for (const product of PRODUCTS) {
    // `type` comes from the product itself now — one of them is deliberately not
    // a dish, to show that a drink adds no cooking time to the promise.
    await createIfMissing(Dish, { id: product.id }, {
      ...product,
      parentGroup: catalogGroup.id,
      enable: true,
      visible: true,
      isDeleted: false,
    });
  }

  const seededVersion = await Settings.get(DEMO_BALANCES_VERSION_KEY);
  const rewriteBalances = recreate || seededVersion !== DEMO_BALANCES_VERSION;

  for (const [placeId, productBalances] of Object.entries(BALANCES)) {
    for (const [productId, values] of Object.entries(productBalances)) {
      if (!rewriteBalances && (await DishPlace.findOne({ dish: productId, place: placeId }))) continue;
      await DishPlace.upsertForPlace(productId, placeId, {
        localBalance: values.localBalance ?? null,
        rmsBalance: values.rmsBalance ?? null,
        enable: values.enable ?? true,
      });
    }
  }

  if (rewriteBalances) {
    // Pairs dropped from BALANCES must lose their row: no row is how the demo
    // shows a product that is unlimited at every point.
    const keep = new Set(
      Object.entries(BALANCES).flatMap(([placeId, productBalances]) =>
        Object.keys(productBalances).map((productId) => `${productId} ${placeId}`),
      ),
    );
    const stale = (await DishPlace.find({ where: { dish: { in: demoProductIds } } }))
      .filter((row: any) => !keep.has(`${row.dish} ${row.place}`))
      .map((row: any) => row.id);
    if (stale.length) await DishPlace.destroy({ id: { in: stale } }).fetch();

    await Settings.set(DEMO_BALANCES_VERSION_KEY, {
      key: DEMO_BALANCES_VERSION_KEY,
      value: DEMO_BALANCES_VERSION,
    });
  }
}

/**
 * Drops the demo cities from the installation-wide sync config.
 *
 * The map link is not a column on `City`, it is an entry in
 * `DELIVERY_ZONE_SYNC_CONFIG` keyed by city id — so recreating the cities under
 * the same ids re-attaches the link pasted before the reseed. A reseed owns
 * those entries as much as it owns the rows. Entries for cities this seed did
 * not create are left alone.
 */
async function forgetDeliveryZoneSources(cityIds: string[]): Promise<void> {
  const config = ((await Settings.get("DELIVERY_ZONE_SYNC_CONFIG")) ?? {}) as Record<string, any>;
  const { cities, ...shared } = config;
  if (!Array.isArray(cities)) return;
  const kept = cities.filter((entry: any) => !cityIds.includes(entry?.city));
  if (kept.length === cities.length) return;
  // Same shape the popup writes when the last link is cleared: `cities` is
  // omitted rather than emptied, because an empty array fails the target check.
  await Settings.set("DELIVERY_ZONE_SYNC_CONFIG", {
    key: "DELIVERY_ZONE_SYNC_CONFIG",
    value: { ...shared, ...(kept.length ? { cities: kept } : {}) },
  } as any);
}

/**
 * Local delivery zones over the demo kitchens.
 *
 * Local means no `source` and no `externalId`, which is exactly the state the
 * iteration requires to be usable on its own: an operator can create and edit
 * these without configuring an external source, and no schedule starts because
 * of them.
 */
async function seedDeliveryZones(recreate: boolean): Promise<void> {
  const cityIds = [...CITIES.map((city) => city.id), ...RETIRED_CITY_IDS];
  const zoneIds = [...ZONES.map((zone) => zone.id), ...RETIRED_ZONE_IDS];

  if (recreate) {
    // Zones before cities, because zones point at them. Everything imported into
    // a demo city goes too, not just the zones listed here: the source that
    // brought them in is forgotten in the same breath, so a reseed leaves the
    // demo with the locally drawn zones and an empty link field again.
    await DeliveryZone.destroy({ city: { in: cityIds } }).fetch();
    await DeliveryZone.destroy({ id: { in: zoneIds } }).fetch();
    await City.destroy({ id: { in: cityIds } }).fetch();
    await forgetDeliveryZoneSources(cityIds);
  }

  for (const city of CITIES) {
    await createIfMissing(City, { id: city.id }, { ...city });
  }

  for (const zone of ZONES) {
    await createIfMissing(DeliveryZone, { id: zone.id }, {
      ...zone,
      polygon: zone.polygon.map((point) => [...point]),
      enable: true,
    });
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

/** Seeded once, no longer created — destroyed so a reseed does not strand it. */
const RETIRED_PROMOTION_IDS = ["demo-promo-local-zone"];

async function seedPromotions(recreate: boolean): Promise<void> {
  const promotionIds = [...PROMOTIONS.map((promotion) => promotion.id), ...RETIRED_PROMOTION_IDS];

  if (recreate) {
    await Promotion.destroy({ id: { in: promotionIds } }).fetch();
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
        // spelled here, and it keeps the zone the only thing these two vary.
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

/** The operators used to demonstrate per-place rights in the Stock Manager. */
async function seedOperators(adminizer: any, recreate: boolean): Promise<void> {
  const accessRights = adminizer.modelHandler.internal("access-rights");
  const users = adminizer.modelHandler.internal("users");
  const groupModel = accessRights.get("Group");
  const userModel = users.get("User");

  const logins = ["stock-demo-center", "stock-demo-north", "stock-demo-both"];
  const groupNames = ["Demo stock: Center", "Demo stock: North"];

  if (recreate) {
    for (const login of logins) await userModel.destroy({ login });
    for (const name of groupNames) await groupModel.destroy({ name });
  }

  const centerGroup = await ensureDemoAdminGroup(
    groupModel,
    groupNames[0],
    "Can work with Demo kitchen: Center only",
    "demo-kitchen-center",
  );
  const northGroup = await ensureDemoAdminGroup(
    groupModel,
    groupNames[1],
    "Can work with Demo kitchen: North only",
    "demo-kitchen-north",
  );

  const { generate } = require("password-hash") as { generate(value: string): string };
  const password = (login: string) => generate(login + DEMO_PASSWORD + process.env.AP_PASSWORD_SALT);
  for (const user of [
    { login: logins[0], fullName: "Demo operator Center", groups: [centerGroup.id] },
    { login: logins[1], fullName: "Demo operator North", groups: [northGroup.id] },
    { login: logins[2], fullName: "Demo operator Both kitchens", groups: [centerGroup.id, northGroup.id] },
  ]) {
    await createIfMissing(userModel, { login: user.login }, {
      ...user,
      passwordHashed: password(user.login),
      isActive: true,
      isConfirmed: true,
      isAdministrator: false,
    });
  }
}

/**
 * Fills a development database with a usable catalog, two kitchens, per-place
 * stock and the operators to look at it with.
 *
 * Driven by `MULTI_KITCHEN_DEMO_SEED`: `true` adds what is missing and never
 * overwrites anything, `recreate` first deletes the entities the seed owns.
 * Anything else leaves the database untouched.
 */
/**
 * An Asia extract of OSM: what this project runs against, and what answers for
 * the demo cities. A real installation keeps the public instance.
 */
const DEV_GEOCODER_URL = "https://asia.nominatim.m42.cx";

/**
 * Points the geocoder at the development instance, and only on an explicit
 * recreate.
 *
 * That flag is the operator saying "rebuild the demo"; an ordinary boot must
 * never replace a real geocoder with a test one. Map links are deliberately not
 * seeded — they are pasted per city on the delivery zones page, which is the
 * path worth exercising.
 */
async function seedGeocoder(recreate: boolean): Promise<void> {
  if (!recreate || process.env.NODE_ENV === "production") return;

  await Settings.set("NOMINATIM_URL", { key: "NOMINATIM_URL", value: DEV_GEOCODER_URL } as any);
  sails.log.warn(`[MultiKitchen demo] geocoder set to ${DEV_GEOCODER_URL}`);
}

export async function seedMultiKitchenDemo(adminizer: any): Promise<void> {
  const mode = readSeedMode();
  if (mode === "off") return;

  const recreate = mode === "recreate";
  if (recreate) {
    sails.log.warn(
      "[MultiKitchen demo] recreate mode: seeded catalog, places, stock, zones, demo cities and operators are dropped first",
    );
  }

  await seedCatalog(recreate);
  await seedStockDemo(recreate);
  await seedDeliveryZones(recreate);
  // The zones above are only exercised if the chain asks them first.
  await Settings.set("KITCHEN_RESOLVE_CHAIN", {
    key: "KITCHEN_RESOLVE_CHAIN",
    value: ["delivery-zone", "nearest-geo", "single-point"],
  } as any);
  await seedGeocoder(recreate);
  await seedPromotions(recreate);
  await seedOperators(adminizer, recreate);

  const groups = devCatalog.groups?.length ?? 0;
  const dishes = devCatalog.dishes?.length ?? 0;
  sails.log.info(
    `[MultiKitchen demo] Seeded ${groups} catalog groups, ${dishes} catalog products, ` +
    `${PLACES.length} kitchens, ${CITIES.length} cities, ${ZONES.length} local zone(s), ` +
    `${PROMOTIONS.length} promotions, two admin groups and three users. Password: ${DEMO_PASSWORD}`,
  );

  // A module that ships development fixtures cannot know when the demo cities
  // appear: hook load order decides whether it initialised before or after this
  // seed, and on a normal boot it is before. So the seed says when it is done
  // rather than leaving anyone to guess.
  emitter.declare("core:demo-seed:done", "The multi-kitchen demo seed has finished");
  emitter.emit("core:demo-seed:done");
}
