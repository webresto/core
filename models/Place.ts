import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";

import { v4 as uuid } from "uuid";
import { WorkTime } from "@webresto/worktime";
import { CityRecord } from "./City";
import { assertCoordinate } from "../lib/place";

export interface PlaceCoordinate {
  lat: number;
  lon: number;
}

let attributes = {
  id: {
    type: "string",
    //required: true,
  } as unknown as string,
  /** Terminal or department identifier in the RMS. Empty until an RMS maps this point. */
  rmsId: {
    type: "string",
    allowNull: true,
  } as unknown as string,
  title: "string",
  address: "string",
  order: "number" as unknown as number,
  phone: "string",
  enable: {
    type: "boolean",
  } as unknown as boolean,
  worktime: "json" as unknown as WorkTime,
  isPickupPoint: "boolean" as unknown as boolean,
  /**
   * TODO: Idea for cooking poin ballancing + wortime
   */
  // cookingPointFallback: {
  //   model: "place",
  // },
  isCookingPoint: "boolean" as unknown as boolean,
  /** The point has a room to eat in: what `dine-in` orders are taken at. */
  hasDiningArea: {
    type: "boolean",
    defaultsTo: false,
  } as unknown as boolean,
  /** Which city's list of points this one is in. */
  city: {
    model: "city",
  } as unknown as CityRecord | string,
  /** Geographic position of the point. Required only by geo/route kitchen modes. */
  coordinate: {
    type: "json",
  } as unknown as PlaceCoordinate | null,
  customData: "json" as unknown as any,
};
type attributes = typeof attributes;

export interface PlaceRecord extends attributes, ORM {}

let Model = {
  beforeCreate(placeInit: PlaceRecord, cb: (err?: string) => void) {
    if (!placeInit.id) {
      placeInit.id = uuid();
    }

    try {
      if (placeInit.coordinate !== undefined && placeInit.coordinate !== null) {
        assertCoordinate(placeInit.coordinate);
      }
      cb();
    } catch (error) {
      cb(error instanceof Error ? error.message : String(error));
    }
  },

  beforeUpdate(placeUpdate: Partial<PlaceRecord>, cb: (err?: string) => void) {
    try {
      if (placeUpdate.coordinate !== undefined && placeUpdate.coordinate !== null) {
        assertCoordinate(placeUpdate.coordinate);
      }
      cb();
    } catch (error) {
      cb(error instanceof Error ? error.message : String(error));
    }
  },
};

module.exports = {
  primaryKey: "id",
  attributes: attributes,
  ...Model,
};

declare global {
  const Place: typeof Model & ORMModel<PlaceRecord, never>;
}
