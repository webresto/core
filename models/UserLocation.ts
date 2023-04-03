import ORM from "../interfaces/ORM";
import ORMModel from "../interfaces/ORMModel";
import { v4 as uuid } from "uuid";
import User from "../models/User"

let attributes = {
  
  /** ID */
  id: {
    type: "string",
    //required: true,
  } as unknown as string,

  name: 'string',
  city: 'string',
  home: 'string',
  housing: 'string',
  index: 'string',
  entrance: 'string',
  floor: 'string',
  apartment: 'string',
  doorphone: 'string',
  street: 'string',
  user: {
    model: 'user',
  } as unknown as User | string,
  
  comment: "string",
  customData: "json" as unknown as {
    [key: string]: string | boolean | number;
  } | string,
};

type attributes = typeof attributes;
interface UserLocation extends attributes, ORM {}
export default UserLocation;

let Model = {
  beforeCreate(UserLocationInit: any, next: any) {
    if (!UserLocationInit.id) {
      UserLocationInit.id = uuid();
    }
    
    next();
  },
};

module.exports = {
  primaryKey: "id",
  attributes: attributes,
  ...Model,
};

declare global {
  const UserLocation: typeof Model & ORMModel<UserLocation, null>;
}
