import ORM from "../interfaces/ORM";
import  { ORMModel, CriteriaQuery } from "../interfaces/ORMModel";
import { v4 as uuid } from "uuid";
import { RequiredField, OptionalAll } from "../interfaces/toolsTS";
import { UserRecord } from "./User";

export type NotificationToken = {
  provider: "fcm" | "apns" | "webpush" | string;
  platform: "ios" | "android" | "web";
  token: string;
  updatedAt: number;
};
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

  /** Owner of the device. May be empty (null) — a device always exists, but it gets bound to a user only after login */
  user: {
    model: 'user'
  } as unknown as UserRecord | string | null,
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

  /** Провайдер-независимый токен уведомлений (FCM, APNs, WebPush и т.д.) */
  notificationToken: {
    type: "json",
  } as unknown as NotificationToken | null,
};

type attributes = typeof attributes;
/**
 * @deprecated use `UserDeviceRecord` instead
 */
interface UserDevice extends RequiredField<OptionalAll<attributes>, null >, ORM {}
export interface UserDeviceRecord extends RequiredField<OptionalAll<attributes>, null >, ORM {}


let Model = {
  beforeUpdate(record: UserDeviceRecord, cb:  (err?: string) => void){
    record.lastActivity = Date.now();
    // NOTE: `user` is intentionally NOT stripped here anymore. Binding an empty
    // device to a user (and the "rebind forbidden" rule) is handled centrally in
    // `User.authDevice`. Stripping it here made it impossible to ever bind a device.
    if (record.isLoggedIn === false) {
      record.sessionId = null
    }
    cb();
  },

  /**
   * For each request from user device to core
   */
  afterUpdate(record: UserDeviceRecord, cb:  (err?: string) => void){
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
  async setActivity(criteria: CriteriaQuery<UserDeviceRecord>, client:  { lastIP?: string , userAgent?: string } = {}): Promise<void> {
    await UserDevice.update(criteria, client).fetch();
  },

  async setNotificationToken(deviceId: string, token: NotificationToken): Promise<void> {
    await UserDevice.updateOne({ id: deviceId }).set({ notificationToken: token });
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
  const UserDevice: typeof Model & ORMModel<UserDeviceRecord,  "lastIP" >;
}
