import ORM from "../interfaces/ORM";
import ORMModel from "../interfaces/ORMModel";
import { v4 as uuid } from "uuid";
import { RequiredField, OptionalAll } from "../interfaces/toolsTS";
import User from "../models/User"
let attributes = {
  
  /** ID */
  id: {
    type: "string",
    //required: true,
  } as unknown as string,

  name: 'string',
  userAgent: 'string',

  isLogined: "boolean" as unknown as boolean,

  user: {
    model: 'user',
    via: 'devices'
  } as unknown as User | String,
  lastIP: "string",
  loginTime: "number",
  lastActivity: "number",
  authToken:  {
    type: "string",
    allowNull: true
  } as unknown as string,
  customData: "json" as unknown as {
    [key: string]: string | boolean | number;
  } | string,
};

type attributes = typeof attributes;
interface UserDevice extends RequiredField<OptionalAll<attributes>, null >, ORM {}
export default UserDevice;

let Model = {
  beforeUpdate(record: UserDevice, next: Function){
    record.lastActivity = new Date().toISOString();
    if(record.user) delete record.user
    if (record.isLogined === false) {
      record.authToken = null
    }

    if (record.isLogined === true) {
      record.authToken = uuid();
    }
    
  },
  beforeCreate(record: any, next: Function) {
    record.lastActivity = new Date().toISOString();
    if (!record.id) {
      record.id = uuid();
    }

    if (record.isLogined === true) {
      record.authToken = uuid();
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
  const UserDevice: typeof Model & ORMModel<UserDevice,  "lastIP" >;
}
