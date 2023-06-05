import ORM from "../interfaces/ORM";
import ORMModel from "../interfaces/ORMModel";
import { v4 as uuid } from "uuid";
import { WorkTime } from "@webresto/worktime";

let attributes = {
  id: {
    type: "string",
    //required: true,
  } as unknown as string,
  title: 'string',
  address: 'string',
  order: 'number' as unknown as number,
  phone: 'string',
  enable: {
    type: 'boolean',
    required: true
  } as unknown as boolean,
  worktime: 'json' as unknown as WorkTime,
  isPickupPoint: 'boolean'as unknown as boolean,
  isCookingPoint: 'boolean'as unknown as boolean,
  isSalePoint: 'boolean'as unknown as boolean,
  customData: 'json' as unknown as any
};
type attributes = typeof attributes;
interface Place extends attributes, ORM {}
export default Place;

let Model = {
  beforeCreate(placeInit: any, cb:  (err?: string) => void) {
    if (!placeInit.id) {
      placeInit.id = uuid();
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
  const Place: typeof Model & ORMModel<Place, null>;
}