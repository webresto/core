// Pure helpers of the "Variants" control (`Dish.variants`, `interfaces/Variants.ts`): the draft of
// the attributes and of the variants, what a regeneration keeps, and the value the field gets.
//
// A row of the draft is a mapping plus what only the control needs:
//   { values, rel?, isDefault, price, keep }
// `rel` - the variant exists; without it the row is a request to create one at `price`.
// `keep` - the row goes into the value: an existing variant unticked is marked deleted by the
// save of the dish, a combination unticked is never created.

const text = (value) => (typeof value === 'string' ? value.trim() : '');

/** The value of the field as the control reads it; anything that is not a box is an empty one. */
export function normalizeVariants(value) {
  const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  const options = (Array.isArray(source.options) ? source.options : []).map((option) => ({
    key: text(option?.key),
    name: text(option?.name),
    values: (Array.isArray(option?.values) ? option.values : []).map((item) => ({ value: item?.value, title: text(item?.title) })),
  }));
  const rows = (Array.isArray(source.mappings) ? source.mappings : []).map((mapping) => ({
    values: { ...(mapping?.values ?? {}) },
    rel: mapping?.rel || null,
    isDefault: Boolean(mapping?.isDefault),
    price: typeof mapping?.price === 'number' ? mapping.price : null,
    keep: true,
  }));
  return { options, rows };
}

/**
 * A value as typed: a number when it reads as one, else the text. The value is what the logic
 * goes by - a mapping, the recipe of a storefront, an integration (an ERP sends numbers) - and the
 * title is what a customer reads.
 */
export function parseValue(text) {
  const typed = String(text ?? '').trim();
  return typed !== '' && Number.isFinite(Number(typed)) ? Number(typed) : typed;
}

/** The rows after the key of an attribute was renamed: its values move under the new key. */
export function renameKey(rows, from, to) {
  return rows.map((row) => {
    if (!Object.prototype.hasOwnProperty.call(row.values, from)) return row;
    const { [from]: value, ...rest } = row.values;
    return { ...row, values: { ...rest, [to]: value } };
  });
}

/** The rows after a value of an attribute was renamed: the rows that had it have the new one. */
export function renameValue(rows, key, from, to) {
  return rows.map((row) => (row.values[key] === from ? { ...row, values: { ...row.values, [key]: to } } : row));
}

/** The attributes after the same renames: `rename` is `{ key, to }` or `{ key, value, to }`. */
export function renameInOptions(options, rename) {
  return options.map((option) => {
    if (option.key !== rename.key) return option;
    if (!('value' in rename)) return { ...option, key: rename.to };
    return { ...option, values: option.values.map((item) => (item.value === rename.value ? { ...item, value: rename.to } : item)) };
  });
}

/** The value of a new item of an attribute made here: an ordinal, the next after the largest number. */
export function nextValue(option) {
  const numbers = option.values.map((item) => item.value).filter((value) => typeof value === 'number');
  return numbers.length ? Math.max(...numbers) + 1 : 1;
}

/** What stops the attributes from being generated from: `{ option, message }`, `option` - its index. */
export function optionsIssues(options) {
  const issues = [];
  const keys = new Map();
  options.forEach((option, index) => {
    if (!option.name) issues.push({ option: index, message: 'An attribute needs a name' });
    if (!option.key) issues.push({ option: index, message: 'An attribute needs a key' });
    else if (!/^[a-z][a-z0-9_]*$/i.test(option.key)) issues.push({ option: index, message: 'A key is latin letters, digits and _' });
    else if (keys.has(option.key)) issues.push({ option: index, message: 'Two attributes have the same key' });
    keys.set(option.key, index);
    if (!option.values.length) issues.push({ option: index, message: 'An attribute needs a value' });
    if (option.values.some((item) => !item.title)) issues.push({ option: index, message: 'A value needs a title' });
    if (new Set(option.values.map((item) => item.value)).size !== option.values.length) issues.push({ option: index, message: 'Two values have the same value' });
    const titles = option.values.map((item) => item.title.toLowerCase()).filter(Boolean);
    if (new Set(titles).size !== titles.length) issues.push({ option: index, message: 'Two values have the same title' });
  });
  return issues;
}

/** Every combination of the values, in the order of the attributes and of their values. */
export function combinations(options) {
  return options.reduce(
    (combos, option) => combos.flatMap((combo) => option.values.map((item) => ({ ...combo, [option.key]: item.value }))),
    [{}],
  );
}

const sameCombination = (options, a, b) => options.every((option) => a[option.key] === b[option.key]);

/**
 * The rows for new attributes, out of the rows there were.
 *
 * A row keeps its place where its values still exist: of a new attribute it takes the first
 * value - "30 cm" becomes "30 cm, no crust" - and so keeps its variant with its price, pictures,
 * stock and orders. A row whose value was removed is gone, and of two rows that became one
 * combination the first stays. Every other combination is a new request, ticked.
 */
export function regenerate(options, rows) {
  const carried = [];
  for (const row of rows) {
    const values = {};
    let alive = true;
    for (const option of options) {
      const had = Object.prototype.hasOwnProperty.call(row.values, option.key);
      const value = had ? row.values[option.key] : option.values[0]?.value;
      if (!option.values.some((item) => item.value === value)) alive = false;
      values[option.key] = value;
    }
    if (alive && !carried.some((kept) => sameCombination(options, kept.values, values))) carried.push({ ...row, values });
  }
  if (!options.length) return [];
  return combinations(options).map(
    (values) => carried.find((row) => sameCombination(options, row.values, values)) ?? { values, rel: null, isDefault: false, price: null, keep: true },
  );
}

/** The titles of a row's values, in the order of the attributes: "30 cm, Cheese". */
export function rowTitle(options, values) {
  return options
    .map((option) => option.values.find((item) => item.value === values[option.key])?.title)
    .filter(Boolean)
    .join(', ');
}

/** What stops the rows from being confirmed: messages, the same for every row they are about. */
export function rowsIssues(rows) {
  const kept = rows.filter((row) => row.keep);
  const issues = [];
  if (!kept.length) issues.push('A dish with attributes needs a variant');
  if (kept.some((row) => !row.rel && (typeof row.price !== 'number' || !(row.price >= 0)))) issues.push('Every new variant needs a price');
  return issues;
}

/**
 * The value of the field: the attributes and a mapping per kept row - an existing variant by its
 * id, a new one as a request with its price. One default: the ticked one, else the first row.
 * No attributes - an empty value, which the model stores as no variants: an ordinary dish. Not
 * `null`: the form of the panel leaves a field it is given `null` for as it was.
 */
export function serializeVariants(options, rows) {
  const kept = options.length ? rows.filter((row) => row.keep) : [];
  const chosen = kept.find((row) => row.isDefault) ?? kept[0];
  return {
    options: options.map((option) => ({ key: option.key, name: option.name, values: option.values.map((item) => ({ value: item.value, title: item.title })) })),
    mappings: kept.map((row) => ({
      // In the order of the attributes, whatever order the row got its keys in: one list is one value.
      values: Object.fromEntries(options.map((option) => [option.key, row.values[option.key]])),
      ...(row.rel ? { rel: row.rel } : { price: row.price }),
      ...(row === chosen ? { isDefault: true } : {}),
    })),
  };
}

/** The attributes of other dishes - a list of `options` per dish - as one list by key: the first name met, every value met. */
export function mergeKnownOptions(lists) {
  const known = new Map();
  for (const options of lists) {
    for (const option of normalizeVariants({ options }).options) {
      if (!option.key) continue;
      const merged = known.get(option.key) ?? { key: option.key, name: option.name, values: [] };
      for (const item of option.values) {
        if (!merged.values.some((had) => had.value === item.value)) merged.values.push(item);
      }
      known.set(option.key, merged);
    }
  }
  return [...known.values()];
}
