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

/**
 * What the seed no longer creates: cities, kitchens, zones and the operators
 * scoped to a point.
 *
 * They are made by an operator now, in scenario 01 — a seeded Yekaterinburg
 * sitting next to the one the scenario creates is a second answer to the
 * question the scenario asks. A seed only ever deletes what it knows the ids of,
 * so what it used to create it still has to clean up: otherwise `dev:seed`
 * leaves four kitchens and three cities behind and they look like an operator's.
 */
const RETIRED_PLACE_IDS = [
  "demo-kitchen-center",
  "demo-kitchen-north",
  "demo-kitchen-tyumen",
  "demo-kitchen-nhatrang",
];
const RETIRED_CITY_IDS = [
  "demo-city-ekaterinburg",
  "demo-city-tyumen",
  "demo-city-nhatrang",
  "demo-city",
  "demo-city-1",
  "demo-city-2",
];
const RETIRED_ZONE_IDS = ["demo-zone-local", "demo-zone-center", "demo-zone-north"];
const RETIRED_PRODUCT_IDS = [
  "demo-product-pizza",
  "demo-product-soup",
  "demo-product-dessert",
  "demo-product-everywhere",
];
const RETIRED_GROUP_IDS = ["demo-stock-group"];
const RETIRED_PROMOTION_IDS = ["demo-promo-local-zone"];
const RETIRED_OPERATOR_LOGINS = ["stock-demo-center", "stock-demo-north", "stock-demo-both"];
const RETIRED_OPERATOR_GROUPS = ["Demo stock: Center", "Demo stock: North"];
/** Stock rows were rewritten once per version; there are no seeded stock rows left. */
const RETIRED_SETTINGS = ["MULTI_KITCHEN_DEMO_BALANCES_VERSION"];

/**
 * A menu of its own for each out-of-town city.
 *
 * Groups and dishes and nothing else. Which kitchen cooks them is stock, not a
 * menu model — and stock names a point, which this seed no longer creates: the
 * operator makes the kitchens in scenario 01 and puts the dishes in stop at the
 * ones that should not sell them. Before an address is given the menu is global,
 * so all three catalogs are on the screen at once; after it, `dish(orderId)` is
 * what narrows the menu to one kitchen.
 */
const CITY_MENUS = [
  {
    group: { id: "demo-tyumen-group", name: "Demo Tyumen" },
    dishes: [
      { id: "demo-tyumen-pelmeni", name: "Сибирские пельмени", price: 390, cookingTimeMax: 20 },
      { id: "demo-tyumen-stroganina", name: "Строганина из муксуна", price: 690, cookingTimeMax: 10 },
      { id: "demo-tyumen-ukha", name: "Уха по-тюменски", price: 320, cookingTimeMax: 25 },
      { id: "demo-tyumen-shangi", name: "Шаньги с картофелем", price: 180, cookingTimeMax: 15 },
      { id: "demo-tyumen-kedr", name: "Десерт с кедровым орехом", price: 240, cookingTimeMax: 10 },
      { id: "demo-tyumen-mors", name: "Морс брусничный", price: 120, cookingTimeMax: 5 },
    ],
  },
  {
    group: { id: "demo-nhatrang-group", name: "Demo Nha Trang" },
    dishes: [
      { id: "demo-nhatrang-pho", name: "Фо бо", price: 350, cookingTimeMax: 15 },
      { id: "demo-nhatrang-banhmi", name: "Бань ми", price: 220, cookingTimeMax: 10 },
      { id: "demo-nhatrang-goicuon", name: "Гой куон", price: 260, cookingTimeMax: 10 },
      { id: "demo-nhatrang-buncha", name: "Бун ча", price: 380, cookingTimeMax: 20 },
      { id: "demo-nhatrang-comtam", name: "Ком там", price: 340, cookingTimeMax: 20 },
      { id: "demo-nhatrang-caphe", name: "Кофе со сгущёнкой", price: 150, cookingTimeMax: 5 },
    ],
  },
] as const;

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

/** The two out-of-town menus, so a city switch has something to switch to. */
async function seedCityMenus(recreate: boolean): Promise<void> {
  const dishIds = CITY_MENUS.flatMap((menu) => menu.dishes.map((dish) => dish.id));
  const groupIds = CITY_MENUS.map((menu) => menu.group.id);

  if (recreate) {
    // Stock set by hand while testing goes with the dish it was set on: a
    // `DishPlace` whose dish is gone is a row nobody can see or delete.
    await DishPlace.destroy({ dish: { in: dishIds } }).fetch();
    await Dish.destroy({ id: { in: dishIds } }).fetch();
    await Group.destroy({ id: { in: groupIds } }).fetch();
  }

  for (const menu of CITY_MENUS) {
    const group = await createIfMissing(Group, { id: menu.group.id }, {
      ...menu.group,
      enable: true,
      isDeleted: false,
    });
    for (const dish of menu.dishes) {
      await createIfMissing(Dish, { id: dish.id }, {
        ...dish,
        type: "dish",
        parentGroup: group.id,
        enable: true,
        visible: true,
        isDeleted: false,
      });
    }
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
}

/**
 * Drops the demo cities from the installation-wide sync config.
 *
 * The map link is not a column on `City`, it is an entry in
 * `DELIVERY_ZONE_SYNC_CONFIG` keyed by city id, so it outlives the row it points
 * at. Entries for cities this seed did not create are left alone.
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
 * Deletes what the seed used to create and no longer does. Recreate only.
 *
 * A list rather than a run of statements because the order is the interesting
 * part: zones and addresses point at a city, stock points at a dish and a place,
 * so each row goes before the row it hangs from. Everything belonging to a demo
 * city goes, not only the ids listed — a zone imported into one has no owner
 * left once the city is gone.
 */
async function retireDemoEntities(adminizer: any): Promise<void> {
  const rows: [any, any][] = [
    [DeliveryZone, { city: { in: RETIRED_CITY_IDS } }],
    [DeliveryZone, { id: { in: RETIRED_ZONE_IDS } }],
    [Address, { city: { in: RETIRED_CITY_IDS } }],
    [City, { id: { in: RETIRED_CITY_IDS } }],
    [DishPlace, { place: { in: RETIRED_PLACE_IDS } }],
    [DishPlace, { dish: { in: RETIRED_PRODUCT_IDS } }],
    [Place, { id: { in: RETIRED_PLACE_IDS } }],
    [Dish, { id: { in: RETIRED_PRODUCT_IDS } }],
    [Group, { id: { in: RETIRED_GROUP_IDS } }],
    [Promotion, { id: { in: RETIRED_PROMOTION_IDS } }],
    [Settings, { key: { in: RETIRED_SETTINGS } }],
  ];
  for (const [model, criteria] of rows) await model.destroy(criteria).fetch();

  await forgetDeliveryZoneSources(RETIRED_CITY_IDS);

  const users = adminizer.modelHandler.internal("users").get("User");
  const groups = adminizer.modelHandler.internal("access-rights").get("Group");
  for (const login of RETIRED_OPERATOR_LOGINS) await users.destroy({ login });
  for (const name of RETIRED_OPERATOR_GROUPS) await groups.destroy({ name });
}

/**
 * Fills a development database with a usable catalog, the two out-of-town menus,
 * one promotion and the settings the scenarios expect.
 *
 * Cities, kitchens, zones and addresses are not here: an operator creates them
 * in scenario 01, from the fixtures in
 * `dev-docs/Сквозной-сценарий/fixtures/`.
 *
 * Driven by `MULTI_KITCHEN_DEMO_SEED`: `true` adds what is missing and never
 * overwrites anything, `recreate` first deletes the entities the seed owns.
 * Anything else leaves the database untouched.
 */
export async function seedMultiKitchenDemo(adminizer: any): Promise<void> {
  const mode = readSeedMode();
  if (mode === "off") return;

  const recreate = mode === "recreate";
  if (recreate) {
    sails.log.warn("[MultiKitchen demo] recreate mode: the seeded catalog, menus and promotions are dropped first");
    await retireDemoEntities(adminizer);
  }

  await seedCatalog(recreate);
  await seedCityMenus(recreate);
  await seedPromotions(recreate);
  await seedSettings();

  const groups = devCatalog.groups?.length ?? 0;
  const dishes = devCatalog.dishes?.length ?? 0;
  sails.log.info(
    `[MultiKitchen demo] Seeded ${groups} catalog groups, ${dishes} catalog products, ` +
    `${CITY_MENUS.length} city menus and ${PROMOTIONS.length} promotions. ` +
    `Cities, kitchens, zones and addresses are the operator's to create.`,
  );
}
