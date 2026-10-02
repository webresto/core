import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";
import { v4 as uuid } from "uuid";
import { UserOrderHistoryRecord } from "./UserOrderHistory";
import { UserDeviceRecord } from "./UserDevice";
import { UserLocationRecord } from "./UserLocation";
import { Country } from "../interfaces/Country";
import { OptionalAll } from "../interfaces/toolsTS";
import { UserBonusProgramRecord } from "./UserBonusProgram";
import { DishRecord } from "./Dish";
const Countries: Country[] = require("../libs/dictionaries/countries.json")
import AuthService from "../libs/AuthService";
export type Phone = {
  code: string
  number: string
  additionalNumber?: string
}

let attributes = {

  /** User model ID — the account key. Nothing else identifies a user (extend_user_account §3.1):
   *  every way in is a row in AuthIdentity, found by (provider, externalId). */
  id: {
    type: "string",
    isNotEmptyString: true,
    unique: true
  } as unknown as string,

  firstName: {
    type: 'string',
    allowNull: true,
    isNotEmptyString: true
  } as unknown as string,

  lastName: {
    type: 'string',
    allowNull: true,
    isNotEmptyString: true
  } as unknown as string,

  sex: {
    type: 'number',
    allowNull: true,
  } as unknown as number,

  /**
   * A contact address, and nothing more: never a way in, never proven by the core (review3 §1.2).
   * Nullable so it can actually be cleared — `User.delete` wipes it, and Waterline refuses `null`
   * for a string attribute without `allowNull`.
   */
  email: {
    type: 'string',
    allowNull: true,
    isEmail: true
  } as unknown as string,

  /**
   * @deprecated Not a login field any more, and not where the user's number lives: a read-only
   * copy of the primary phone-identity (`primaryPhone` → AuthIdentity, provider "phone"), kept
   * only for readers that still expect `user.phone` — bonus/RMS adapters, notifications, the
   * admin panel. Written by AuthService alone (`syncUserProjections`, И13); never set it from
   * anywhere else, and read the number through `primaryPhone` in new code.
   */
  phone: {
    type: 'json',
    // required: true,
    custom: function(phone: Phone) {
      // `phone` is a projection of the primary phone-identity now, and an account can legitimately
      // have none — the validator has to accept the empty state it is asked to store (И13).
      if (phone === null || phone === undefined) return true;
      if (!phone.code || !phone.number) throw `Code or Number of phone not passed`;

      // Check dictionary
      let isCountryCode = false
      for (let country of Countries) {

        if (phone.code.replace(/\D/g, '') === country.phoneCode.replace(/\D/g, '')) isCountryCode = true;
      }

      if (typeof phone.code !== "string" || typeof phone.number !== "string" || isCountryCode === false) {
        return false
      }
      return true
    }
  } as unknown as Phone,

  birthday: {
    type: 'string',
    // isAfter: new Date('Sat Jan 1 1900 00:00:00 GMT-0000'),
    // isBefore: new Date().setFullYear(new Date().getFullYear()-10)
  } as unknown as string,

  favorites: {
    collection: 'dish',
    via: 'favorites'
  } as unknown as DishRecord[],

  bonusProgram: {
    collection: 'userbonusprogram',
    via: 'user'
  } as unknown as UserBonusProgramRecord[],

  history: {
    collection: 'UserOrderHistory',
    via: 'user'
  } as unknown as UserOrderHistoryRecord[],

  locations: {
    collection: 'UserLocation',
    via: 'user'
  } as unknown as UserLocationRecord[],

  devices: {
    collection: 'UserDevice',
    via: 'user'
  } as unknown as UserDeviceRecord[],

  /**
   *  Has success verification Phone
   */
  verified: {
    type: 'boolean'
  } as unknown as boolean,

  /** External auth accounts linked to this user (telegram / max / vk / phone / …) */
  identities: {
    collection: 'authidentity',
    via: 'user'
  } as unknown as import("./AuthIdentity").AuthIdentityRecord[],

  /**
   * Which phone-identity is the primary one — a reference, not a flag on AuthIdentity
   * (extend_user_account §3.3): with no transactions in this project, "exactly one row flagged
   * primary" cannot be kept as an invariant across several writes, while a nullable FK on User
   * cannot desync by construction. This is what external bonus/RMS adapters see as `User.phone`,
   * and where security notices about the identity set (§6) are sent.
   */
  primaryPhone: {
    model: 'authidentity',
  } as unknown as import("./AuthIdentity").AuthIdentityRecord | string | null,

  /**
   * Indicate filled all required custom fields
   */
  allRequiredCustomFieldsAreFilled: {
    type: 'boolean'
  } as unknown as boolean,

  /** Its temporary code for authorization */
  temporaryCode: {
    type: 'string',
    allowNull: true
  } as unknown as string,

  /**
   * UserGroup (new, best…)
   * Its Idea for making different promo for users
   */
  // group: "string",

  /** Mark as kitchen worker
   * its idea for making a delivery message for Employers
   * */
  // isEmployee: {
  //   type:'boolean'
  // } as unknown as boolean,

  orderCount: {
    type: 'number',
  } as unknown as number,

  isDeleted: {
    type:'boolean'
  } as unknown as boolean,

  /**
   * Object with filed custom user fields
  */
  customFields: "json" as unknown as {
    [key: string]: string | boolean | number;
  } | string,

  /**
  * Any data storage for person
  */
  customData: "json" as unknown as {
    [key: string]: string | boolean | number;
  } | string,


};

type attributes = typeof attributes;
/**
 * @deprecated use `UserRecord` instead
 */
interface User extends OptionalAll<attributes>, ORM {}
export interface UserRecord extends OptionalAll<attributes>, ORM {}


let Model = {
  async beforeCreate(userInit: UserRecord, cb:  (err?: string) => void) {
    if (!userInit.id) {
      userInit.id = uuid();
    }

    if (!userInit.isDeleted) userInit.isDeleted = false;
    userInit.orderCount = 0;
    // Phone required — unless a social-first login mode is enabled (ALLOW_USER_WITHOUT_PHONE).
    // In that mode AuthService.materializeUser may create a user off a provider identity alone;
    // the phone is attached (and thus verified) later via a "verify:phone" AuthAttempt.
    const allowWithoutPhone = (await Settings.get("ALLOW_USER_WITHOUT_PHONE")) ?? false;
    if (!allowWithoutPhone && !userInit.phone) {
      sails.log.error(`User should have a phone on creation (id: ${userInit.id})`);
      // Refused THROUGH the callback, not by throwing past it: waterline never settles the
      // query when a lifecycle callback throws, so `User.create().fetch()` used to hang for
      // ever instead of rejecting — the same failure mode review2 §4.1 found in afterCreate.
      return cb(`User phone is required`);
    }

    return cb();
  },

  async afterCreate(record: UserRecord, cb:  (err?: string) => void) {
    emitter.emit('core:user-after-create', record);

//    It was commented because it broke tests, after login it called, this reason for comment it here
//    try {
//      User.checkRegisteredInBonusPrograms(record.id);
//    } catch (error) {
//      sails.log.error(error)
//    }

    return cb();
  },

  /**
   * If a favorite dish exists in a favorites collection, it will be deleted. And vice versa
   * @param userId
   * @param dishId
   */
  async handleFavoriteDish(userId: string, dishId: string): Promise<void> {
    let user = await User.findOne({id: userId}).populate("favorites");
    let favoritesIds = user.favorites.map((i) => i.id);
    if (favoritesIds.includes(dishId)) {
      await User.removeFromCollection(userId, "favorites").members([dishId])
    }  else {
      await User.addToCollection(userId, "favorites").members([dishId])
    }
  },

  /**
   * @param ticket one-time result of a `purpose: "verify:delete_account"` AuthAttempt
   *   (design2 §10.3 — "one code, every door" is closed: a code minted for login no longer
   *   opens account deletion).
   */
  async delete(userId: string, ticket: string, force: boolean = false): Promise<void> {
    if (!force) {
      if (!ticket) {
        throw `Ticket required for deleting user`;
      }
      const resolved = await AuthService.consumeTicket(ticket, "verify:delete_account");
      if (!resolved || resolved.userId !== userId) {
        throw `Ticket check failed`;
      }
    }
    // Soft delete, in the order the crash windows want: the flag first, so that from here on no
    // JWT verifies and every identity already reads as an orphan; then the sessions; then the
    // identities themselves — the keys go with the account, or "deleted" would be a state the
    // next login walks straight back into (review2 §3). Orders keep pointing at the account.
    // The address goes with the flag: `phone` is cleared by the projection sync below once the
    // identities are gone, and nothing else would ever clear `email`.
    await User.updateOne({ id: userId }, { isDeleted: true, email: null });
    await UserDevice.update({ user: userId }, { isLoggedIn: false }).fetch();
    await AuthService.forgetAccountIdentities(userId);
  },

  /**
   * Returns phone string by user criteria
   * Additional number will be added separated by commas (+19990000000,1234)
   * @returns String
   * @param phone
   * @param target
   */
  async getPhoneString(phone: Phone, target: "login" | "print" | "string" = "login") {
    if (target === "login") {
      return (phone.code + phone.number).replace(/\D/g, "");
    } else if (target === "print") {
      // TODO: implement mask `+1 (111) 123-45-67`
      // GPT: return `+${phone.code} (${phone.number.slice(0,3)}) ${phone.number.slice(3,6)}-${phone.number.slice(6,8)}-${phone.number.slice(8)}`
    } else {
      return `${phone.code}${phone.number}${phone.additionalNumber ? "," + phone.additionalNumber : ""}`;
    }
  },

  /**
   * Bind (or rebind) a device to `userId` and open a fresh session. The SAME mechanism every
   * login path ends at — phone, social, ticket exchange — so session issuance is single-sourced
   * (design2 §0). `identityId`, when known, records which identity this session was opened
   * through (extend_user_account §3.4): needed so unlinking that identity can revoke sessions
   * opened via it.
   */
  async authDevice(userId: string, deviceId: string, deviceName: string, userAgent: string, IP: string, identityId?: string): Promise<UserDeviceRecord> {
    let userDevice = await UserDevice.findOne({ id: deviceId });

    if (!userDevice) {
      // Brand new device — create it already bound to the user that logs in
      userDevice = await UserDevice.create({ id: deviceId, user: userId, name: deviceName, lastIP: IP }).fetch();
    } else if (userDevice.user !== userId) {
      // Device is unclaimed, or was claimed by a different user (e.g. shared/test device, or a
      // previous owner who logged out). A physical device always belongs to whoever is CURRENTLY
      // authenticated on it, so we (re)bind it — the JWT/session below must always match the user
      // who just proved their credentials, never a stale owner.
      if (userDevice.user) {
        sails.log.info(`[UserDevice] Rebinding device [${deviceId}] from user [${userDevice.user}] to user [${userId}]`);
      }
      await UserDevice.updateOne({ id: deviceId }).set({ user: userId });
    }

    // Refresh the session for the current login (sessionId guards against parallel logins with one name)
    return await UserDevice.updateOne({ id: deviceId }, {
      loginTime: Date.now(),
      isLoggedIn: true,
      lastIP: IP,
      userAgent: userAgent,
      sessionId: uuid(),
      ...(identityId ? { identity: identityId } : {}),
    });
  },

  /**
    check all active bonus programs for user
  */
  async checkRegisteredInBonusPrograms(userId: string): Promise<void> {
    let user = await User.findOne({id: userId})
    if (!user) throw `User not found`
    const bps = await BonusProgram.getAvailable()
    for (let bp of bps) {
      let adapter = await BonusProgram.getAdapter(bp.adapter);
      const userBonusProgram = await UserBonusProgram.findOne({user: user.id, bonusProgram: bp.id});

      // If all works
      if (adapter.isRegistered(user) && userBonusProgram && userBonusProgram.isActive) {
        // Not need await finish sync
        UserBonusProgram.sync(userId, bp.id);

      // If not registered in internal storage
      } else if(adapter.isRegistered(user) && !userBonusProgram) {
        let exUser = await adapter.getUserInfo(user);
        await UserBonusProgram.create({
          user: user.id,
          balance: exUser.balance,
          externalId: exUser.externalId,
          isActive: true,
          isDeleted: false,
          bonusProgram: adapter.id,
          syncedToTime: "0"
        }).fetch();

        // If not registered but needed
      } else if(!adapter.isRegistered(user) && bp.automaticUserRegistration) {
        // Registration if Bonus program has an automatic registration option
        await UserBonusProgram.registration(user, bp.adapter);

      // if not need register
      } else {
        sails.log.debug(`User should register manual: user[${user.id}], bonusProgram: [${bp.name}]`)
      }
    }
  },
};

module.exports = {
  primaryKey: "id",
  attributes: attributes,
  ...Model,
};

declare global {
  const User: typeof Model & ORMModel<UserRecord, null >;
}
