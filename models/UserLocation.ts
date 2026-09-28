import ORM from "../interfaces/ORM";
import {ORMModel} from "../interfaces/ORMModel";
import { v4 as uuid } from "uuid";
import OrderAddress from "../interfaces/OrderAddress";
import { wholeLine } from "../lib/user-location";
import { UserRecord } from "./User";

/**
 * An address the customer has been delivered to: `Order.address` without the
 * catalog node.
 *
 * No node on purpose. A saved address is where the courier went, and a catalog
 * edit — a street renamed, a house moved or deleted — must not move it. The line
 * and the coordinate are everything an order needs from it.
 */
type LocationAddress = Omit<OrderAddress, "node"> & { formatted: string };

/** One attribute per field of `OrderAddress`, so the two shapes cannot drift apart. */
const addressAttributes: Record<keyof LocationAddress, object> = {
  formatted: {
    type: "string",
    required: true,
  },
  city: {
    type: "string",
    allowNull: true,
  },
  home: {
    type: "string",
    allowNull: true,
  },
  housing: {
    type: "string",
    allowNull: true,
  },
  apartment: {
    type: "string",
    allowNull: true,
  },
  entrance: {
    type: "string",
    allowNull: true,
  },
  floor: {
    type: "string",
    allowNull: true,
  },
  doorphone: {
    type: "string",
    allowNull: true,
  },
  comment: {
    type: "string",
    allowNull: true,
  },
  coordinate: {
    type: "json",
  },
};

let attributes = {

  /** ID */
  id: {
    type: "string",
    //required: true,
  } as unknown as string,

  /** What the storefront lists. `formatted` unless given. */
  name: {
    type: "string",
    allowNull: true,
  } as unknown as string,

  ...(addressAttributes as unknown as LocationAddress),

  /**
   * Set as default for specific user
   * */
  isDefault: {
    type: 'boolean',
  } as unknown as boolean,

  user: {
    model: 'user',
    required: true
  } as unknown as UserRecord | string,

  customData: "json" as unknown as {
    [key: string]: string | boolean | number;
  } | string,
};

type attributes = typeof attributes;
export interface UserLocationRecord extends attributes, ORM {}

let Model = {

  async beforeCreate(init: UserLocationRecord, cb:  (err?: string) => void) {
    if (!init.id) {
      init.id = uuid();
    }

    if (!init.name) {
      init.name = init.formatted;
    }

    if(init.isDefault === true) {
      await UserLocation.update({user: init.user}, {isDefault: false})
    }

    cb();
  },

  /**
   * Makes one of the user's locations the default and unsets the rest of theirs.
   *
   * Scoped by the owner in both writes: an id of someone else's location finds
   * nothing and changes nothing, and is refused like an id that does not exist.
   */
  async setDefault(user: string, id: string): Promise<UserLocationRecord> {
    const [location] = await UserLocation.update!({ id, user }, { isDefault: true }).fetch();
    if (!location) throw `User location not found`;
    await UserLocation.update!({ user, id: { "!=": id } }, { isDefault: false });
    return location;
  },

  /**
   * Keeps the address of a delivered order, once per line.
   *
   * The only way a location is written: the customer's own deliveries are the
   * list, there is no separate "save this address". A line the user already
   * has is left as it is — with its name and whether it is the default.
   */
  async remember(user: string, address: OrderAddress): Promise<void> {
    if (!address.formatted) return;
    const formatted = wholeLine(address.formatted, address.home);
    if (await UserLocation.findOne!({ user, formatted })) return;

    const given = address as Record<string, unknown>;
    const tail = Object.keys(addressAttributes)
      .filter((key) => given[key] !== undefined && given[key] !== null)
      .map((key) => [key, given[key]]);
    await UserLocation.create!({ ...Object.fromEntries(tail), formatted, user }).fetch();
  },
};

module.exports = {
  primaryKey: "id",
  attributes: attributes,
  ...Model,
};

declare global {
  const UserLocation: typeof Model & ORMModel<UserLocationRecord, never>;
}
