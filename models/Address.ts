import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";

import { v4 as uuid } from "uuid";
import { CityRecord } from "./City";
import {
  ADDRESS_SEARCH_LIMIT,
  ADDRESS_TYPES,
  AddressPoint,
  AddressType,
  CHILD_ONLY,
  ROOT_SEARCHABLE,
} from "../lib/address";
import { isValidCoordinate } from "../lib/delivery-location";

/**
 * The address catalog of a city: one flat table, one row per node.
 *
 * A node knows its city and its parent, and nothing else about where it sits.
 * There is no `ancestors` column and no table of names or codes: the graph is at
 * most four deep, so the path is read by following `parent`, and every query the
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

  type: {
    type: "string",
    isIn: [...ADDRESS_TYPES],
    required: true,
  } as unknown as AddressType,

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

  /** Only leaves carry one: `house`, `entrance`, `place`. */
  point: {
    type: "json",
  } as unknown as AddressPoint | null,

  /** Id of the street in an RMS. Null for everything entered here or imported from a file. */
  externalId: {
    type: "string",
    allowNull: true,
  } as unknown as string | null,

  enable: {
    type: "boolean",
    defaultsTo: true,
  } as unknown as boolean,
};

type attributes = typeof attributes;
export interface AddressRecord extends attributes, ORM {}

function idOf(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  if (value && typeof value === "object") return (value as { id?: string }).id;
  return undefined;
}

function matches(node: AddressRecord, needle: string): boolean {
  if (node.name?.toLowerCase().includes(needle)) return true;
  return (node.names ?? []).some((alias) => typeof alias === "string" && alias.toLowerCase().includes(needle));
}

async function assertNode(values: Partial<AddressRecord>): Promise<void> {
  if (values.point !== undefined && values.point !== null && !isValidCoordinate(values.point)) {
    throw new Error("Address point must contain a valid latitude and longitude");
  }

  const parentId = idOf(values.parent);

  if (values.type && CHILD_ONLY.includes(values.type) && !parentId) {
    throw new Error(`Address of type "${values.type}" is only ever a child: parent is required`);
  }

  if (parentId) {
    const parent = await Address.findOne({ id: parentId });
    if (!parent) throw new Error(`Address parent ${parentId} not found`);

    const city = idOf(values.city);
    if (city && idOf(parent.city) !== city) {
      throw new Error("Address parent belongs to another city");
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
   * With no `parent` the search starts at the city and sees only the types that
   * make sense on their own; with one it sees that node's children, whatever
   * they are. Matching is done here rather than in the query because `names` is
   * a json array and because "лени" has to find "Ленина".
   */
  async search(params: { city: string; parent?: string | null; query: string }): Promise<AddressRecord[]> {
    const criteria: Record<string, unknown> = { city: params.city, enable: true };

    if (params.parent) {
      criteria.parent = params.parent;
    } else {
      criteria.parent = null;
      criteria.type = ROOT_SEARCHABLE;
    }

    const nodes = await Address.find(criteria).sort("name ASC");
    const needle = (params.query ?? "").trim().toLowerCase();
    const found = needle ? nodes.filter((node) => matches(node, needle)) : nodes;

    return found.slice(0, ADDRESS_SEARCH_LIMIT);
  },

  /** The nodes from the city down to `id`, in that order. What `formatted` is built from. */
  async path(id: string): Promise<AddressRecord[]> {
    const chain: AddressRecord[] = [];
    let current: string | undefined = id;

    // The graph is at most four deep; the bound is what stops a parent set to
    // its own descendant from spinning the server instead of returning junk.
    while (current && chain.length < ADDRESS_TYPES.length) {
      const node: AddressRecord = await Address.findOne({ id: current });
      if (!node) break;
      chain.unshift(node);
      current = idOf(node.parent);
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
