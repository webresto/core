/**
 * A small multi-kitchen installation for unit tests: two cities, three kitchens,
 * two delivery zones, a counter that does not cook, and five products with
 * stock that differs between kitchens.
 *
 *              K11   K12   K21
 *   A          ∞     ∞     ∞      everywhere
 *   B          ∞     0     0      only K11
 *   C          ∞     ∞     0      not in City2
 *   D          2     5     ∞      different amounts
 *   S          ∞     ∞     ∞      cooks for 60 minutes
 *
 * `City1` holds K11 and K12 and the counter P1; `City2` holds K21. Zone Z11
 * belongs to K11 and Z12 to K12; City2 has no zone, so its addresses go to the
 * nearest kitchen.
 *
 * Core's own code runs on top: the models' methods, the menu adapter, the
 * kitchen chain. Only the ORM, the geocoder, the delivery tariff and the
 * journal are stand-ins.
 */
import { FakeDatabase, FakeTable } from "./fake-orm";
import { Adapter, DeliveryAdapter } from "../../../adapters";
import { Delivery } from "../../../interfaces/Delivery";

export const COORD = {
  K11: { lat: 10.0, lon: 10.0 },
  K12: { lat: 10.0, lon: 10.1 },
  K21: { lat: 50.0, lon: 50.0 },
  P1: { lat: 10.0, lon: 10.02 },
  /** Inside Z11. */
  inZ11: { lat: 10.0, lon: 10.01 },
  /** Inside Z12. */
  inZ12: { lat: 10.0, lon: 10.09 },
  /** City1, outside every zone; K12 is the nearest kitchen. */
  outside: { lat: 10.0, lon: 10.4 },
  /** City2; no zones there. */
  inCity2: { lat: 50.0, lon: 50.01 },
};

const ZONES = [
  { id: "Z11", placeId: "K11", cost: 100, minLat: 9.9, maxLat: 10.1, minLon: 9.9, maxLon: 10.05 },
  { id: "Z12", placeId: "K12", cost: 150, minLat: 9.9, maxLat: 10.1, minLon: 10.05, maxLon: 10.2 },
];

function zoneOf(coordinate: { lat: number; lon: number } | null | undefined) {
  if (!coordinate) return null;
  return ZONES.find((zone) =>
    coordinate.lat >= zone.minLat && coordinate.lat <= zone.maxLat &&
    coordinate.lon >= zone.minLon && coordinate.lon <= zone.maxLon) ?? null;
}

/** Zones as rectangles; outside them the soft calculation decides, as the real adapter does. */
class TestDelivery extends DeliveryAdapter {
  constructor(private readonly settings: Map<string, unknown>) {
    super();
  }

  public async resolvePlaceForCoordinate(coordinate: any, candidates: any[], diagnostics: string[] = []) {
    const zone = zoneOf(coordinate);
    if (!zone) {
      diagnostics.push("in no zone");
      return null;
    }
    if (!candidates.some((candidate) => candidate.id === zone.placeId)) {
      diagnostics.push(`zone ${zone.id}: its kitchen is not open`);
      return null;
    }
    return zone.placeId;
  }

  public async calculate(order: any): Promise<Delivery> {
    return this.checkAbility(order.address);
  }

  public async checkAbility(address: any): Promise<Delivery> {
    const zone = zoneOf(address?.coordinate);
    if (zone) {
      return { allowed: true, cost: zone.cost, item: undefined, message: "", deliveryTimeMinutes: 30, zoneId: zone.id } as Delivery;
    }
    if (this.settings.get("SOFT_DELIVERY_CALCULATION")) {
      return { allowed: true, cost: null, item: undefined, message: "a manager will call", deliveryTimeMinutes: null } as any;
    }
    return { allowed: false, cost: 0, item: undefined, message: "outside every zone", deliveryTimeMinutes: undefined } as any;
  }
}

/** The address's own coordinate; a free-text address has none. */
const testGeo = {
  async locate(address: any) {
    return { coordinate: address?.coordinate ?? null, diagnostics: [] as string[] };
  },
  async describe(address: any) {
    return { formatted: address?.formatted ?? "", selfAddressed: false };
  },
  async addressByCoordinate() {
    return null;
  },
  async search() {
    return [];
  },
  async path() {
    return [];
  },
};

export interface JournalEntry {
  orderId: string;
  level: string;
  message: string;
  data: any;
}

const MODELS = ["Order", "OrderDish", "Dish", "Group", "DishPlace", "Place", "City", "Image"] as const;
const OTHER_GLOBALS = [
  "sails", "Settings", "emitter", "Adapter", "Maintenance", "SalesChannel", "PromotionCode",
  "PaymentMethod", "PaymentDocument", "User", "UserOrderHistory",
] as const;

export class MultiKitchenWorld {
  readonly db = new FakeDatabase();
  readonly settings = new Map<string, unknown>();
  readonly journal: JournalEntry[] = [];
  readonly events: Array<{ name: string; args: any[] }> = [];
  /** Set to an object with `supportsMultiKitchen` to install an RMS. */
  rms: { supportsMultiKitchen: boolean } | null = null;

  private saved = new Map<string, unknown>();
  private orders!: FakeTable;

  static install(): MultiKitchenWorld {
    const world = new MultiKitchenWorld();
    world.bind();
    world.seed();
    return world;
  }

  private bind(): void {
    for (const name of [...MODELS, ...OTHER_GLOBALS]) this.saved.set(name, (global as any)[name]);

    const g = global as any;
    g.sails = {
      log: { error() {}, warn() {}, info() {}, debug() {}, silly() {}, verbose() {} },
      __: (format: string, ...args: unknown[]) => args.reduce<string>((text, arg) => text.replace("%s", String(arg)), format),
      dictionaries: { countries: {} },
      config: {},
    };
    g.Settings = {
      get: async (key: string) => this.settings.get(key),
      set: async (key: string, value: unknown) => {
        this.settings.set(key, value);
      },
    };
    g.emitter = {
      emit: async (name: string, ...args: any[]) => {
        this.events.push({ name, args });
        return [];
      },
    };

    this.orders = this.db.table("order", {
      dishes: { collection: "orderdish", via: "order" },
      pickupPoint: { model: "place" },
      paymentMethod: { model: "paymentmethod" },
      user: { model: "user" },
    });
    this.db.table("orderdish", { order: { model: "order" }, dish: { model: "dish" }, cookingPoint: { model: "place" } }, true);
    this.db.table("dish", { parentGroup: { model: "group" }, images: { collection: "image", via: "dish" } });
    this.db.table("group", {
      parentGroup: { model: "group" },
      childGroups: { collection: "group", via: "parentGroup" },
      dishes: { collection: "dish", via: "parentGroup" },
      images: { collection: "image", via: "group" },
    });
    this.db.table("dishplace", { dish: { model: "dish" }, place: { model: "place" } });
    this.db.table("place", { city: { model: "city" } });
    this.db.table("city");
    this.db.table("image");
    this.db.table("paymentmethod");
    this.db.table("user");

    const withMethods = (table: FakeTable, file: string, extra: Record<string, unknown> = {}) => {
      const model = require(`../../../models/${file}`);
      const descriptors = Object.getOwnPropertyDescriptors(model);
      delete descriptors.attributes;
      delete descriptors.primaryKey;
      const bound = Object.defineProperties({}, descriptors);
      // The table's own ORM verbs win over lifecycle callbacks of the same name.
      return Object.assign(bound, bindTable(table), extra);
    };

    g.Order = withMethods(this.orders, "Order", {
      log: async (criteria: any, level: string, _module: string, message: string, data?: any) => {
        this.journal.push({ orderId: String(criteria?.id ?? criteria), level, message, data });
      },
      emitAndLog: async (_criteria: any, name: string, ...args: any[]) => {
        this.events.push({ name, args });
        return [];
      },
      emitAndLogDetached: (_criteria: any, name: string, ...args: any[]) => {
        this.events.push({ name, args });
      },
    });
    g.OrderDish = withMethods(this.db.get("orderdish"), "OrderDish");
    g.Dish = withMethods(this.db.get("dish"), "Dish");
    g.Group = withMethods(this.db.get("group"), "Group");
    g.DishPlace = withMethods(this.db.get("dishplace"), "DishPlace");
    g.Place = bindTable(this.db.get("place"));
    g.City = bindTable(this.db.get("city"));
    g.Image = bindTable(this.db.get("image"));
    g.PaymentMethod = { ...bindTable(this.db.get("paymentmethod")), checkAvailable: async () => true, isPaymentPromise: async () => false };
    g.User = bindTable(this.db.get("user"));
    g.Maintenance = { getActiveMaintenance: async () => undefined };
    g.SalesChannel = { normalizePlatform: async (platform: string) => platform };
    g.PromotionCode = { getValidPromotionCode: async () => null };
    g.PaymentDocument = { findOne: async () => undefined, find: async () => [] };
    g.UserOrderHistory = { save: async () => undefined };

    g.Adapter = Adapter;
    Adapter.register("geo", "test", testGeo as any);
    Adapter.register("delivery", "test", new TestDelivery(this.settings));
    (Adapter as any).instancePromotionAdapter = {
      processOrder: async (order: any) => ({ ...order, discountTotal: 0, promotionFlatDiscount: 0 }),
    };
    Object.defineProperty(Adapter, "instanceRMS", {
      configurable: true,
      get: () => this.rms ?? undefined,
      set: () => undefined,
    });
  }

  private seed(): void {
    for (const [key, value] of Object.entries({
      MENU_PLACE_BASED_MODE: "default",
      GEO_ADAPTER: "test",
      DELIVERY_ADAPTER: "test",
      KITCHEN_RESOLVE_CHAIN: ["delivery-zone", "rms", "nearest-geo", "single-point"],
      DISH_PLACE_BALANCE_MODE: "minimum",
      SOFT_DELIVERY_CALCULATION: false,
      DELIVERY_MAX_RADIUS_KM: 0,
      TZ: "Etc/GMT",
    })) this.settings.set(key, value);

    this.db.get("city").seed([
      { id: "City1", name: "City One" },
      { id: "City2", name: "City Two" },
    ]);

    const point = (id: string, city: string, cooks: boolean) => ({
      id, title: id, city, enable: true, isCookingPoint: cooks, isPickupPoint: true, hasDiningArea: true,
      coordinate: (COORD as any)[id], worktime: null,
    });
    this.db.get("place").seed([
      point("K11", "City1", true),
      point("K12", "City1", true),
      point("K21", "City2", true),
      point("P1", "City1", false),
    ]);

    this.db.get("group").seed([{ id: "G", name: "Menu", slug: "menu", isDeleted: false, enable: true, visible: true, sortOrder: 0 }]);

    const product = (id: string, extra: Record<string, unknown> = {}) => ({
      id, name: id, price: 100, weight: 1, type: "dish", enable: true, isDeleted: false, visible: true,
      modifier: false, notForSale: false, cookingTimeMax: 20, modifiers: [], parentGroup: "G", ...extra,
    });
    this.db.get("dish").seed([
      product("A"),
      product("B"),
      product("C"),
      product("D"),
      product("S", { cookingTimeMax: 60 }),
    ]);

    this.setStock("B", "K12", 0);
    this.setStock("B", "K21", 0);
    this.setStock("C", "K21", 0);
    this.setStock("D", "K11", 2);
    this.setStock("D", "K12", 5);
  }

  /** Operator stock of a product at a kitchen; `null` removes the limit. */
  setStock(dish: string, place: string, localBalance: number | null): void {
    const table = this.db.get("dishplace");
    table.rows = table.rows.filter((row) => !(row.dish === dish && row.place === place));
    if (localBalance !== null) table.seed([{ dish, place, localBalance, rmsBalance: null, enable: true }]);
  }

  stock(dish: string, place: string): number | null {
    return this.db.get("dishplace").rows.find((row) => row.dish === dish && row.place === place)?.localBalance ?? null;
  }

  setPlace(id: string, values: Record<string, unknown>): void {
    Object.assign(this.db.get("place").rows.find((row) => row.id === id)!, values);
  }

  /** A fresh basket, as the storefront creates it on first load. */
  newOrder(values: Record<string, unknown> = {}): string {
    const id = `order-${this.orders.rows.length + 1}`;
    this.orders.seed([{
      id, state: "CART", serviceType: "delivery", isPromoting: false, paid: false,
      cookingPoints: [], address: null, pickupPoint: null, customer: null,
      promotionCode: null, promotionCodeCheckValidTill: null, promotionCodeString: null,
      discountTotal: 0, dishesCount: 0, message: "", maxWaitMinutes: null, date: null,
      user: null, deviceId: "device", ...values,
    }]);
    return id;
  }

  order(id: string): Record<string, any> {
    return this.orders.rows.find((row) => row.id === id)!;
  }

  /** The basket as `{ dish: amount }`. */
  lines(orderId: string): Record<string, number> {
    const out: Record<string, number> = {};
    for (const row of this.db.get("orderdish").rows) {
      if (row.order === orderId) out[row.dish] = (out[row.dish] ?? 0) + row.amount;
    }
    return out;
  }

  /** `{ dish: cookingPoint }` of each line. */
  lineKitchens(orderId: string): Record<string, string | null> {
    const out: Record<string, string | null> = {};
    for (const row of this.db.get("orderdish").rows) if (row.order === orderId) out[row.dish] = row.cookingPoint ?? null;
    return out;
  }

  messages(orderId: string, text: string): JournalEntry[] {
    return this.journal.filter((entry) => entry.orderId === orderId && entry.message === text);
  }

  // ---- what the storefront does -------------------------------------------

  async update(orderId: string, values: Record<string, unknown>): Promise<Record<string, any>> {
    await (Order as any).update({ id: orderId }, values).fetch();
    return Order.countCart({ id: orderId });
  }

  selectCity(orderId: string, cityName: string) {
    return this.update(orderId, { serviceType: "delivery", address: { city: cityName }, pickupPoint: null });
  }

  deliverTo(orderId: string, coordinate: { lat: number; lon: number } | null, city = "City One") {
    return this.update(orderId, {
      serviceType: "delivery",
      address: { city, formatted: "Street, 1", ...(coordinate ? { coordinate } : {}) },
      pickupPoint: null,
    });
  }

  pickUp(orderId: string, point: string, serviceType: "pickup" | "dine-in" = "pickup") {
    return this.update(orderId, { serviceType, pickupPoint: point });
  }

  add(orderId: string, dish: string, amount = 1) {
    return Order.addDish({ id: orderId }, dish, amount, [], "", "user");
  }

  async setCount(orderId: string, dish: string, amount: number) {
    const line = this.db.get("orderdish").rows.find((row) => row.order === orderId && row.dish === dish)!;
    return Order.setCount({ id: orderId }, { ...line, dish: this.db.get("dish").rows.find((row) => row.id === dish) } as any, amount);
  }

  check(orderId: string) {
    return Order.check({ id: orderId }, { name: "Customer", phone: { code: "+1", number: "5550000" } } as any);
  }

  restore(): void {
    delete (Adapter as any).instanceRMS;
    (Adapter as any).instancePromotionAdapter = undefined;
    for (const [name, value] of this.saved) (global as any)[name] = value;
  }
}

/** The table's ORM verbs as own properties, bound to it. */
function bindTable(table: FakeTable) {
  return {
    find: table.find.bind(table),
    findOne: table.findOne.bind(table),
    count: table.count.bind(table),
    create: table.create.bind(table),
    update: table.update.bind(table),
    updateOne: table.updateOne.bind(table),
    destroy: table.destroy.bind(table),
  };
}

/** What an awaited call threw, or `null`. */
export async function thrown(promise: Promise<unknown>): Promise<any> {
  try {
    await promise;
    return null;
  } catch (error) {
    return error ?? "undefined was thrown";
  }
}
