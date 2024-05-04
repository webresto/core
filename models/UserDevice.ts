import ORM from "../interfaces/ORM";
import  { ORMModel, CriteriaQuery } from "../interfaces/ORMModel";
import { v4 as uuid } from "uuid";
import { RequiredField, OptionalAll } from "../interfaces/toolsTS";
import User from "../models/User"
let attributes = {

  /** ID */
  id: {
    type: "string",
    //required: true,
  } as unknown as string,

  /** Generated name from an OS type, and location */
  name: 'string',

  userAgent: 'string',

  isLoggedIn: "boolean" as unknown as boolean,

  user: {
    model: 'user',
    required: true
  } as unknown as User | String,
  lastIP: "string",
  loginTime:  { type: "number"} as unknown as number,
  lastActivity: { type: "number"} as unknown as number,

  /**  (not jwt-token)  */
  sessionId:  {
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
  beforeUpdate(record: UserDevice, cb:  (err?: string) => void){
    record.lastActivity = Date.now();
    if(record.user) delete record.user
    if (record.isLoggedIn === false) {
      record.sessionId = null
    }
    cb();
  },

  /**
   * For each request from user device to core
   */
  afterUpdate(record: UserDevice, cb:  (err?: string) => void){
    UserBonusProgram.syncAll(record.user as string);
    return cb();
  },

  beforeCreate(record: any, cb:  (err?: string) => void) {
    record.lastActivity = Date.now();
    if (!record.id) {
      record.id = uuid();
    }

    cb();
  },

  /** Method set lastActivity for a device */
  async setActivity(criteria: CriteriaQuery<UserDevice>, client:  { lastIP?: string , userAgent?: string } = {}): Promise<void> {
    await UserDevice.update(criteria, client).fetch();
  },

  async checkSession(sessionId: string, userId: string, client: { lastIP?: string , userAgent?: string } = {}): Promise<boolean> {
    let ud = await UserDevice.findOne({sessionId: sessionId})

    if (!ud) {
      return false;
    }

    if(ud.user === userId && ud.isLoggedIn) {
      await UserDevice.setActivity({id: ud.id}, client)
      return true;
    }
    return false;
  }
};

module.exports = {
  primaryKey: "id",
  attributes: attributes,
  ...Model,
};

declare global {
  const UserDevice: typeof Model & ORMModel<UserDevice,  "lastIP" >;
}
