/**
 * A dish with variants — a size, a crust, a number of pieces.
 *
 * Both sides are rows of `Dish`. The **box** is what the menu shows: it carries `variants`, is
 * never sold itself and its price is not read. A **variant** is what is sold: an ordinary dish
 * with its own price, stock and pictures, whose `parentId` is the box. There is no flag: a dish
 * with `variants` is a box, a dish with `parentId` is a variant.
 */

/** A value of an attribute. `value` is what a mapping refers to, `title` is what a customer reads. */
export interface VariantOptionValue {
  value: string | number;
  title: string;
}

/** An attribute of a box: "Size" with its values. */
export interface VariantOption {
  key: string;
  name: string;
  values: VariantOptionValue[];
}

/**
 * One variant of a box: a combination of values and the dish that is sold for it.
 *
 * A row without `rel` is a request: saving the box creates the dish at `price` and writes its id
 * here, and `price` leaves the row. A combination with no row does not exist.
 */
export interface VariantMapping {
  /** A value of every attribute, by the attribute's `key`. */
  values: Record<string, string | number>;
  /** The id of the variant's `Dish`. */
  rel?: string;
  /** The variant chosen when the dish is opened; one per box. */
  isDefault?: boolean;
  /** Of a request only: the price the variant is created at. */
  price?: number;
}

/**
 * `Dish.variants`. The order of the arrays is the order of display: of the attributes in the
 * switch and in a variant's name, of the values inside an attribute.
 */
export interface DishVariants {
  options: VariantOption[];
  mappings: VariantMapping[];
}
