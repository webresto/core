import { isDeepStrictEqual } from "node:util";
import type { DishRecord } from "../../models/Dish";
import type { DishVariants, VariantMapping, VariantOption } from "../../interfaces/Variants";
import { toId } from "../association-id";

/**
 * The name of a variant: the name of its box and the titles of its values, in the order of the
 * attributes — "Pizza 1, 30 cm, Cheese crust".
 *
 * Stored in the variant's row and never typed by hand. Notifications, the order board and the
 * stock page print the dish of an order line and know nothing of boxes: with the name of the box
 * copied they would print three identical lines for three sizes.
 */
export function variantName(boxName: string, options: VariantOption[], values: VariantMapping["values"]): string {
  const titles = options.flatMap((option) => {
    const chosen = option.values.find((candidate) => candidate.value === values[option.key]);
    return chosen ? [chosen.title] : [];
  });
  return [boxName, ...titles].join(", ");
}

/**
 * Whether a value of `Dish.variants` makes a box: a box has attributes. Anything else a form or
 * a tool may write there - an empty object, no attributes left - is stored as no variants: the
 * admin panel cannot write `null` into a field, and "is a box" must not depend on the shape of
 * an empty value.
 */
export function hasAttributes(variants: unknown): boolean {
  return Array.isArray((variants as DishVariants | null)?.options) && (variants as DishVariants).options.length > 0;
}

/**
 * Whether a box still sells its variants: one that is gone, deleted or switched off sells none.
 * The box is what the menu shows and what an administrator switches off; a variant keeps its own
 * switch for itself.
 */
export function boxSells(box: Pick<DishRecord, "isDeleted" | "enable"> | undefined): boolean {
  return !!box && !box.isDeleted && box.enable !== false;
}

/**
 * What is set at the box and read at the variant.
 *
 * The basket and the menu take these from the dish of an order line, and that is the variant.
 * Copied on every save of the box, so the code that reads them stays as it is: reading them at
 * the box instead would mean a switch in every such place, and a missed one would silently take
 * the variant's value.
 *
 * The modifiers are among them: they are set at the box for all its variants, and the basket
 * reads them at the dish of its line.
 */
function sharedSettings(box: DishRecord) {
  return {
    parentGroup: toId(box.parentGroup),
    cookingTimeMax: box.cookingTimeMax,
    worktime: box.worktime,
    tags: box.tags,
    type: box.type,
    notForSale: box.notForSale,
    concept: box.concept,
    modifiers: box.modifiers ?? [],
  };
}

/**
 * Brings the variants of a box in line with its `variants` — run after every save of a dish.
 *
 * - A mapping without `rel` is a request: its dish is created at the request's price, switched on,
 *   with what it shares with the box, and its id is written into the mapping. One ordinary save
 *   of the box thus creates the box and its variants; a variant needs the id of the box, which an
 *   unsaved dish does not have.
 * - A variant no mapping names any more is marked deleted, as are all of them once the box is
 *   deleted or has no `variants`. Marked, not destroyed: lines of old orders refer to it.
 * - The others get their name rebuilt and the shared settings of the box.
 */
export async function syncVariants(box: DishRecord): Promise<void> {
  // A variant: its box is what writes it.
  if (box.parentId) return;

  const variants = box.isDeleted ? undefined : box.variants;
  const mappings = variants?.mappings ?? [];
  const options = variants?.options ?? [];
  const shared = sharedSettings(box);
  const nameOf = (mapping: VariantMapping) => variantName(box.name, options, mapping.values);

  const requests = mappings.filter((mapping) => !mapping.rel);
  // A variant is created switched on, so a request without a price would put a free dish on
  // sale. Checked before the first one is created: a save that fails leaves no variants behind.
  const unpriced = requests.find((mapping) => typeof mapping.price !== "number");
  if (unpriced) throw new Error(`Variant "${nameOf(unpriced)}" has no price to be created at`);
  for (const mapping of requests) {
    const created = await Dish.create!({
      ...shared,
      name: nameOf(mapping),
      price: mapping.price as number,
      parentId: box.id,
      enable: true,
    }).fetch();
    mapping.rel = created.id;
    delete mapping.price;
  }
  // Without `fetch`: this hook is not run again by its own write. `box` is the record the caller
  // of the save gets, and it already holds the ids.
  if (requests.length) await Dish.update!({ id: box.id }, { variants });

  const named = new Map(mappings.map((mapping) => [mapping.rel, mapping]));
  for (const row of await Dish.find!({ parentId: box.id, isDeleted: false })) {
    const mapping = named.get(row.id);
    const wanted: Record<string, unknown> = mapping ? { ...shared, name: nameOf(mapping) } : { isDeleted: true };
    const patch = Object.fromEntries(
      Object.entries(wanted).filter(([key, value]) => !isDeepStrictEqual((row as unknown as Record<string, unknown>)[key] ?? null, value ?? null)),
    );
    if (Object.keys(patch).length) await Dish.update!({ id: row.id }, patch).fetch();
  }
}
