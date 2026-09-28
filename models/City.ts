import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";

import { v4 as uuid } from "uuid";
import { PlaceRecord } from "./Place";

let attributes = {
  /** ID */
  id: {
    type: "string",
    //required: true,
  } as unknown as string,

  /** Id in external system */
  externalId: {
    type: "string"
  } as unknown as string,

  /** Name of street */
  name: "string",
  slug: "string",
  boundingBox: "json",
  /**
   * Base URL of the backend serving this city, e.g. `https://api.city.example`.
   * The storefront switches to it when the customer picks the city. Rows are
   * mirrored across servers, so the value is always absolute; null only on a
   * single-server installation where there is nothing to switch to.
   */
  url: "string",
  /** City was deleted */
  isDeleted: {
    type:'boolean'
  } as unknown as boolean,

  /** The points that serve this city: what the storefront lists after a city is chosen. */
  places: {
    collection: "place",
    via: "city",
  } as unknown as PlaceRecord[],

  customData: "json" as unknown as {
    [key: string]: string | boolean | number;
  } | string,
};

type attributes = typeof attributes;
export interface CityRecord extends attributes, ORM {}

let Model = {
  beforeCreate(streetInit: CityRecord, cb:  (err?: string) => void) {
    if (!streetInit.id) {
      streetInit.id = uuid();
    }

    cb();
  },
};

module.exports = {
  primaryKey: "id",
  attributes: attributes,
  ...Model,
};

declare global {
  const City: typeof Model & ORMModel<CityRecord, never>;
}
