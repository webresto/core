import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";

import { v4 as uuid } from "uuid";
import { CityRecord } from "./City";
import { Adapter } from "../adapters";
import { AddressPoint } from "../interfaces/Geo";
import { compareAddressNames } from "../lib/address/compare";
import { leadingNumber, rangeCovers } from "../lib/address/range";
import { isValidCoordinate } from "../lib/address/coordinate";
import { nameMatches } from "../lib/address/name-match";
import { toId } from "../lib/association-id";

/**
 * The address catalog of a city: one flat table, one row per node.
 *
 * A node knows its city and its parent, and nothing else about where it sits.
 * There is no `ancestors` column and no table of names or codes: the graph is
 * shallow, so the path is read by following `parent`, and every query the
 * storefront makes is "the children of this node" or "the roots of this city".
 *
 * Houses are rows here too, with their own `point`. That is the whole reason the
 * catalog exists: an address chosen from it resolves to a coordinate without a
 * geocoder, which is what makes a delivery calculation repeatable.
 */

let attributes = {
  /** ID */
  id: {
    type: "string",
  } as unknown as string,

  /** Which city's catalog this node belongs to. On every node, so a search never walks up. */
  city: {
    model: "city",
    required: true,
  } as unknown as CityRecord | string,

  /** The node above. Null means a direct child of the city. */
  parent: {
    model: "address",
  } as unknown as AddressRecord | string | null,

  /**
   * One of the geo adapter's `addressTypes`. Checked by `assertNode`, not by
   * `isIn`: attributes are read when models load, before the adapter exists.
   */
  type: {
    type: "string",
    required: true,
  } as unknown as string,

  /** "Ленина", "12", "гост. Прибалтийская". */
  name: {
    type: "string",
    required: true,
  } as unknown as string,

  /** Aliases, former names, transliterations. Searched together with `name`. */
  names: {
    type: "json",
    defaultsTo: [],
  } as unknown as string[],

  /** Only leaves carry one: `house`, `entrance`, `unit`, `place`, and a `range` for its middle. */
  point: {
    type: "json",
  } as unknown as AddressPoint | null,

  /**
   * The house numbers a `range` node stands for, and nobody else's business.
   *
   * A street of five hundred houses is not worth five hundred rows when the
   * whole block delivers the same: one node says "1 to 99", carries the point
   * of its middle, and the number the customer types stays in `home`.
   * `null` on either side is a range open at that end.
   */
  lo: {
    type: "number",
    allowNull: true,
  } as unknown as number | null,

  hi: {
    type: "number",
    allowNull: true,
  } as unknown as number | null,

  // Parity is the one thing that lets a street be a zone border — odd side in
  // one zone, even in the other; bring it back if that case shows up.
  // parity: {
  //   type: "string",
  //   isIn: ["any", "odd", "even"],
  //   defaultsTo: "any",
  // } as unknown as "any" | "odd" | "even",

  /** Id of the street in an RMS. Null for everything entered here or imported from a file. */
  externalId: {
    type: "string",
    allowNull: true,
  } as unknown as string | null,
};

type attributes = typeof attributes;
export interface AddressRecord extends attributes, ORM {}

async function assertNode(values: Partial<AddressRecord>): Promise<void> {
  if (values.type !== undefined && !(await Adapter.getGeoAdapter()).addressTypes.includes(values.type)) {
    throw new Error(`Address type "${values.type}" is unknown`);
  }

  if (values.point !== undefined && values.point !== null && !isValidCoordinate(values.point)) {
    throw new Error("Address point must contain a valid latitude and longitude");
  }

  // Bounds belong to a range and to nothing else. On any other type they would
  // be a second, silent answer to "which house is this" that no search reads.
  if (values.type && values.type !== "range") {
    if (typeof values.lo === "number" || typeof values.hi === "number") {
      throw new Error(`Address of type "${values.type}" cannot carry lo or hi: those make a range`);
    }
  }

  const parentId = toId(values.parent);

  if (parentId) {
    const parent = await Address.findOne({ id: parentId });
    if (!parent) throw new Error(`Address parent ${parentId} not found`);

    const city = toId(values.city);
    if (city && toId(parent.city) !== city) {
      throw new Error("Address parent belongs to another city");
    }
  }

  // Two identical names of one type under one parent are a data entry mistake:
  // the list would show the same word twice and the customer would take
  // whichever came first. Two "Ленина" in one city are fine — under two
  // different districts, which is exactly what tells them apart.
  const city = toId(values.city);
  if (city && values.type && values.name) {
    const twin = await Address.findOne({
      city,
      parent: parentId ?? null,
      type: values.type,
      name: values.name,
    });
    if (twin && twin.id !== values.id) {
      throw new Error(`Address "${values.name}" of type "${values.type}" already exists here`);
    }
  }
}

let Model = {
  async beforeCreate(init: AddressRecord, cb: (err?: string) => void) {
    try {
      if (!init.id) init.id = uuid();
      await assertNode(init);
      cb();
    } catch (error) {
      cb(error instanceof Error ? error.message : String(error));
    }
  },

  async beforeUpdate(values: Partial<AddressRecord>, cb: (err?: string) => void) {
    try {
      await assertNode(values);
      cb();
    } catch (error) {
      cb(error instanceof Error ? error.message : String(error));
    }
  },

  /**
   * What to offer for what the customer has typed.
   *
   * With no `parent` the search starts at the city, with one it sees that node's
   * children, whatever they are. Matching is done here rather than in the query
   * because `names` is a json array and because "лени" has to find "Ленина".
   *
   * At the root a node qualifies two ways. By type: a street under a ward is
   * still a street, and a customer who types "Trần Phú" must not have to know
   * which ward it is in first — depth deliberately is not a filter, that was a
   * per-city assumption about structure. Or by hanging off the city itself: a
   * camp site has no streets, its tents are direct children of the city, and
   * "42" has to find "Шатёр 42". House numbers stay out of both: a `house`
   * hangs under a street, so "10" still finds nothing in a town.
   *
   * A `range` never matches its own name — nobody types "1–99". It
   * matches the number in front of what was typed, and only after every node
   * that matched by name: a house that is really in the catalog is a better
   * answer than the block it belongs to.
   */
  async search(params: { city: string; parent?: string | null; query: string }): Promise<AddressRecord[]> {
    const geo = await Adapter.getGeoAdapter();
    const criteria: Record<string, unknown> = { city: params.city };

    if (params.parent) {
      criteria.parent = params.parent;
    } else {
      criteria.or = [{ type: geo.rootSearchable }, { parent: null }];
    }

    const nodes = await Address.find(criteria);
    const needle = (params.query ?? "").trim().toLowerCase();
    const number = leadingNumber(needle);

    const named = nodes.filter((node) => node.type !== "range" && (!needle || nameMatches(node, needle)));
    const ranges =
      number === null ? [] : nodes.filter((node) => node.type === "range" && rangeCovers(node, number));

    const byName = (a: AddressRecord, b: AddressRecord) => compareAddressNames(a.name, b.name);

    return [...named.sort(byName), ...ranges.sort(byName)].slice(0, geo.addressSearchLimit);
  },

  /** The nodes from the city down to `id`, in that order. What `formatted` is built from. */
  async path(id: string): Promise<AddressRecord[]> {
    const chain: AddressRecord[] = [];
    let current: string | null = id;

    // Not a depth limit: a graph is as deep as its data, and the list of types
    // says nothing about that. The bound is what stops a parent set to its own
    // descendant from spinning the server instead of returning junk.
    while (current && chain.length < 32) {
      const node: AddressRecord = await Address.findOne({ id: current });
      if (!node) break;
      chain.unshift(node);
      current = toId(node.parent);
    }

    return chain;
  },

  /**
   * The one way an RMS writes a street into the catalog.
   *
   * Streets are the only thing an RMS knows about addresses, and it knows them
   * by `externalId`; houses come from a file or from an operator.
   */
  async upsertStreet(values: { city: string; externalId: string; name: string }): Promise<AddressRecord> {
    const existing = await Address.findOne({ city: values.city, type: "street", externalId: values.externalId });

    if (!existing) {
      return await Address.create({
        city: values.city,
        parent: null,
        type: "street",
        name: values.name,
        externalId: values.externalId,
      }).fetch();
    }

    if (existing.name === values.name) return existing;
    return (await Address.update({ id: existing.id }, { name: values.name }).fetch())[0];
  },
};

module.exports = {
  primaryKey: "id",
  attributes: attributes,
  ...Model,
};

declare global {
  const Address: typeof Model & ORMModel<AddressRecord, never>;
}
