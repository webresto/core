import ORM from "../interfaces/ORM";
import ORMModel from "../interfaces/ORMModel";
import { v4 as uuid } from "uuid";
import User from "../models/User"
import Street from "./Street";
let attributes = {
  
  /** ID */
  id: {
    type: "string",
    //required: true,
  } as unknown as string,
  name: {
    type: "string",
    allowNull: true,
  } as unknown as string,
  city: {
    type: "string",
    allowNull: true,
  } as unknown as string,
  home: {
    type: "string",
    allowNull: true,
  } as unknown as string,
  housing: {
    type: "string",
    allowNull: true,
  } as unknown as string,
  index: {
    type: "string",
    allowNull: true,
  } as unknown as string,
  entrance: {
    type: "string",
    allowNull: true,
  } as unknown as string,
  floor: {
    type: "string",
    allowNull: true,
  } as unknown as string,
  apartment: {
    type: "string",
    allowNull: true,
  } as unknown as string,
  doorphone: {
    type: "string",
    allowNull: true,
  } as unknown as string,
  street: {
    model: 'street',
    required: true
  } as unknown as Street | string,
  
  /**
   * Set as default for specific user
   * */
  isDefault: {
    type: 'boolean',
  } as unknown as boolean,
  
  user: {
    model: 'user',
    required: true
  } as unknown as User | string,
  
  comment: {
    type: "string",
    allowNull: true,
  } as unknown as string,
  
  customData: "json" as unknown as {
    [key: string]: string | boolean | number;
  } | string,
};

type attributes = typeof attributes;
interface UserLocation extends attributes, ORM {}
export default UserLocation;

let Model = {
  
  async beforeUpdate(record: UserLocation, cb:  (err?: string) => void) {
    if(record.isDefault === true) {
      await UserLocation.update({user: record.user}, {isDefault: false})
    }  
    
    cb();
  },

  async beforeCreate(init: UserLocation, cb:  (err?: string) => void) {
    if (!init.id) {
      init.id = uuid();
    }

    if (!init.name) {
      const street = await Street.findOne({id: init.street as string});
      init.name = `${street.name} ${init.home}`;
    }

    if(init.isDefault === true) {
      await UserLocation.update({user: init.user}, {isDefault: false})
    }  
    
    cb();
  }
};

module.exports = {
  primaryKey: "id",
  attributes: attributes,
  ...Model,
};

declare global {
  const UserLocation: typeof Model & ORMModel<UserLocation, null>;
}
