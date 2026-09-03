import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";

import { v4 as uuid } from "uuid";
import { WorkTime } from "@webresto/worktime";

export interface PlaceCoordinate {
  lat: number;
  lng: number;
}

function assertCoordinate(value: unknown): asserts value is PlaceCoordinate {
  if (!value || typeof value !== "object") {
    throw new Error("Place coordinate must be an object with lat and lng");
  }

  const coordinate = value as Partial<PlaceCoordinate>;
  if (
    typeof coordinate.lat !== "number" ||
    !Number.isFinite(coordinate.lat) ||
    coordinate.lat < -90 ||
    coordinate.lat > 90 ||
    typeof coordinate.lng !== "number" ||
    !Number.isFinite(coordinate.lng) ||
    coordinate.lng < -180 ||
    coordinate.lng > 180
  ) {
    throw new Error("Place coordinate must contain a valid latitude and longitude");
  }
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
  title: 'string',
  address: 'string',
  order: 'number' as unknown as number,
  phone: 'string',
  enable: {
    type: 'boolean'
  } as unknown as boolean,
  worktime: 'json' as unknown as WorkTime,
  isPickupPoint: 'boolean'as unknown as boolean,
  isCookingPoint: 'boolean'as unknown as boolean,
  isSalePoint: 'boolean'as unknown as boolean,
  /** Geographic position of the point. Required only by geo/route kitchen modes. */
  coordinate: {
    type: 'json',
  } as unknown as PlaceCoordinate | null,
  customData: 'json' as unknown as any
};
type attributes = typeof attributes;

/**
 * @deprecated use `PlaceRecord` instead
 */
interface Place extends attributes, ORM {}
export interface PlaceRecord extends attributes, ORM {}


let Model = {
  beforeCreate(placeInit: PlaceRecord, cb:  (err?: string) => void) {
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
