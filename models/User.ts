import ORM from "../interfaces/ORM";
import ORMModel from "../interfaces/ORMModel";
import { v4 as uuid } from "uuid";
import Dish from "../models/Dish";
import Order from "../models/Order";

let attributes = {
  
  /** ID */
  id: {
    type: "string",
    //required: true,
  } as unknown as string,


  firstName: 'string',

  lastName: 'string',

  email: {
    type: 'string',
    email: true,
  } as unknown as string,

  phone: {
    type: 'string',
    unique: true,
    required: true
  } as unknown as string,

  birthday: {
    type: 'string'
  } as unknown as string,


  passwordHash: {
    type: 'string'
  } as unknown as string,


  favorites: {
    collection: 'dish'
  } as unknown as Dish[],

  history: {
    collection: 'order',
  } as unknown as Order[],

  avatar: "string",

  location: {
    collection: 'location',
    via: 'user'
  },

  verified: {
    type: 'boolean'
  } as unknown as boolean,

  lastActive: 'string',
  
  isDeleted: { 
    type:'boolean'
  } as unknown as boolean,
  
  customData: "json" as unknown as {
    [k: string]: string | boolean | number;
  } | string,
};

type attributes = typeof attributes;
interface User extends attributes, ORM {}
export default User;

let Model = {
  beforeCreate(userInit: any, next: any) {
    if (!userInit.id) {
      userInit.id = uuid();
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
  const User: typeof Model & ORMModel<User>;
}
