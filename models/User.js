"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
const bcryptjs = __importStar(require("bcryptjs"));
const Countries = require("../libs/dictionaries/countries.json");
let attributes = {
    /** User model ID */
    id: {
        type: "string",
        isNotEmptyString: true,
        unique: true
    },
    login: {
        type: 'string',
        required: true,
        isNotEmptyString: true
    },
    firstName: {
        type: 'string',
        allowNull: true,
        isNotEmptyString: true
    },
    lastName: {
        type: 'string',
        allowNull: true,
        isNotEmptyString: true
    },
    sex: {
        type: 'number',
        allowNull: true,
    },
    email: {
        type: 'string',
        isEmail: true
    },
    /**
     * It is a basic login field
     *  type Phone {
          code: string
          number: string
          additionalNumber?: string
        }
     */
    phone: {
        type: 'json',
        // required: true,
        custom: function (phone) {
            if (!phone.code || !phone.number)
                throw `Code or Number of phone not passed`;
            // Check dictionary
            let isCountryCode = false;
            for (let country of Countries) {
                if (phone.code.replace(/\D/g, '') === country.phoneCode.replace(/\D/g, ''))
                    isCountryCode = true;
            }
            if (typeof phone.code !== "string" || typeof phone.number !== "string" || isCountryCode === false) {
                return false;
            }
            return true;
        }
    },
    birthday: {
        type: 'string',
        // isAfter: new Date('Sat Jan 1 1900 00:00:00 GMT-0000'),
        // isBefore: new Date().setFullYear(new Date().getFullYear()-10)
    },
    favorites: {
        collection: 'dish',
        via: 'favorites'
    },
    bonusProgram: {
        collection: 'userbonusprogram',
        via: 'user'
    },
    history: {
        collection: 'UserOrderHistory',
        via: 'user'
    },
    locations: {
        collection: 'UserLocation',
        via: 'user'
    },
    devices: {
        collection: 'UserDevice',
        via: 'user'
    },
    /**
     *  Has success verification Phone
     */
    verified: {
        type: 'boolean'
    },
    /**
     * Indicate filled all required custom fields
     */
    allRequiredCustomFieldsAreFilled: {
        type: 'boolean'
    },
    passwordHash: {
        type: 'string',
        allowNull: true,
        isNotEmptyString: true
    },
    lastPasswordChange: { type: "number" },
    /** Its temporary code for authorization */
    temporaryCode: {
        type: 'string',
        allowNull: true
    },
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
    },
    isDeleted: {
        type: 'boolean'
    },
    /**
     * Object with filed custom user fields
    */
    customFields: "json",
    /**
    * Any data storage for person
    */
    customData: "json",
};
let Model = {
    async beforeCreate(userInit, cb) {
        if (!userInit.id) {
            userInit.id = (0, uuid_1.v4)();
        }
        if (!userInit.isDeleted)
            userInit.isDeleted = false;
        userInit.orderCount = 0;
        // Phone required
        if ((await Settings.get("LOGIN_FIELD")) === undefined || (await Settings.get("LOGIN_FIELD")) === "phone") {
            if (!userInit.phone) {
                sails.log.error(`User with login: ${userInit.login} should has phone on creation`);
                throw `User phone is required`;
            }
        }
        return cb();
    },
    async afterCreate(record, cb) {
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
    async handleFavoriteDish(userId, dishId) {
        let user = await User.findOne({ id: userId }).populate("favorites");
        let favoritesIds = user.favorites.map((i) => i.id);
        if (favoritesIds.includes(dishId)) {
            await User.removeFromCollection(userId, "favorites").members([dishId]);
        }
        else {
            await User.addToCollection(userId, "favorites").members([dishId]);
        }
    },
    async delete(userId, OTP, force = false) {
        if (!force) {
            if (!OTP) {
                throw `OTP required for deleting user`;
            }
            let user = await User.findOne({ id: userId });
            if (!user) {
                throw `OTP required for deleting user`;
            }
            if (await OneTimePassword.check(user.login, OTP)) {
                throw `OTP checks failed`;
            }
        }
        await UserDevice.update({ user: userId }, { isLoggedIn: false });
        User.update({ id: userId }, { isDeleted: true });
    },
    /**
     * Returns phone string by user criteria
     * Additional number will be added separated by commas (+19990000000,1234)
     * @returns String
     * @param phone
     * @param target
     */
    async getPhoneString(phone, target = "login") {
        if (target === "login") {
            return (phone.code + phone.number).replace(/\D/g, "");
        }
        else if (target === "print") {
            // TODO: implement mask `+1 (111) 123-45-67`
            // GPT: return `+${phone.code} (${phone.number.slice(0,3)}) ${phone.number.slice(3,6)}-${phone.number.slice(6,8)}-${phone.number.slice(8)}`
        }
        else {
            return `${phone.code}${phone.number}${phone.additionalNumber ? "," + phone.additionalNumber : ""}`;
        }
    },
    /**
     * Update user password
     *
     * @param userId User id
     * @param newPassword New password
     * @param oldPassword Old Password
     * @param force Skip check old password
     * @param temporaryCode
     * @setting PasswordSalt - Password salt (default: number42)
     * @setting PasswordRegex - Checking password by regex (default: no check)
     * @setting PasswordMinLength - Checks minimum length password (default: no check)
     *
     * Note: node -e "console.log(require('bcryptjs').hashSync(process.argv[1], "number42"));" your-password-here
     */
    async setPassword(userId, newPassword, oldPassword, force = false, temporaryCode) {
        if (!userId || !newPassword)
            throw "UserId and newPassword is required";
        if (!(await Settings.get("SET_LAST_OTP_AS_PASSWORD"))) {
            let passwordRegex = await Settings.get("PASSWORD_REGEX");
            let passwordMinLength = await Settings.get("PASSWORD_MIN_LENGTH");
            let passwordPolicy = await Settings.get("PASSWORD_POLICY");
            if (!passwordPolicy)
                passwordPolicy = "from_otp";
            if (passwordPolicy === "required") {
                if (Number(passwordMinLength) && newPassword.length < Number(passwordMinLength))
                    throw `Password less than minimum length`;
                if (passwordRegex && !newPassword.match(passwordRegex))
                    throw `Password not match with regex`;
            }
        }
        // salt
        let salt = await Settings.get("PasswordSalt");
        if (!salt)
            salt = 8;
        let user = await User.findOne({ id: userId });
        /**
         * If not force, it should check new/old passwords
         * If user does not have oldPassword
         */
        if (!force) {
            if (user.passwordHash) {
                if (!oldPassword)
                    throw "oldPassword is required";
                if (!(await bcryptjs.compare(oldPassword, user.passwordHash))) {
                    throw `Old password is not accepted`;
                }
            }
            else if (temporaryCode) {
                let login = await User.getPhoneString(user.phone);
                if (!(await OneTimePassword.check(login, temporaryCode))) {
                    throw `Temporary code not match`;
                }
            }
        }
        let passwordHash = bcryptjs.hashSync(newPassword, salt);
        return await User.updateOne({ id: user.id }, { passwordHash: passwordHash, lastPasswordChange: Date.now() });
    },
    async login(login, phone, deviceId, deviceName, password, OTP, userAgent, IP) {
        // Stop login when password or OTP not passed
        if (!(password || OTP)) {
            throw `Password or OTP required`;
        }
        // Stop login without deviceName
        if (!deviceName && !deviceId) {
            throw `deviceName && deviceId required`;
        }
        // Define password policy
        let passwordPolicy = await Settings.get("PASSWORD_POLICY");
        if (!passwordPolicy)
            passwordPolicy = "from_otp";
        // Check password
        if (!password && passwordPolicy === "required") {
            throw `Password required`;
        }
        let user = await User.findOne({ login: login });
        // Check OTP
        let checkOTPResult = false;
        if (Boolean(OTP) && typeof OTP === "string" && OTP.length > 0) {
            if (await OneTimePassword.check(login, OTP)) {
                checkOTPResult = true;
            }
        }
        // When password required and LOGIN_OTP_REQUIRED you should pass both
        if (await Settings.get("LOGIN_OTP_REQUIRED") && !checkOTPResult && passwordPolicy === "required")
            throw `login OTP check failed`;
        // When password is disabled Login possibly only by OTP
        if (passwordPolicy === "disabled" && !checkOTPResult)
            throw `Password policy [disabled] (OTP check failed)`;
        // Create user if not exist and only with verified OTP
        let CREATE_USER_IF_NOT_EXIST = await Settings.get("CREATE_USER_IF_NOT_EXIST") || true;
        if (!user && CREATE_USER_IF_NOT_EXIST && checkOTPResult) {
            let loginFiled = await Settings.get("LOGIN_FIELD") || "phone";
            if (loginFiled === "phone") {
                if (!phone) {
                    throw `Phone is required for LOGIN_FIELD: phone`;
                }
            }
            user = await User.create({
                login: login,
                verified: true,
                ...(loginFiled === "phone" || phone !== undefined) && { phone: phone }
            }).fetch();
            if (passwordPolicy === "required") {
                user = await User.setPassword(user.id, password, null, true);
            }
            if (passwordPolicy === "from_otp") {
                user = await User.setPassword(user.id, OTP, null, true);
            }
        }
        if (!user) {
            throw `User not found`;
        }
        // check password if passed or required
        if (password || passwordPolicy === "required") {
            if (!(await bcryptjs.compare(password, user.passwordHash))) {
                throw `Password not match`;
            }
        }
        // Set last checked OTP as password
        if (OTP && passwordPolicy === "from_otp") {
            await User.setPassword(user.id, OTP, null, true);
        }
        try {
            User.checkRegisteredInBonusPrograms(user.id);
        }
        catch (error) {
            sails.log.error(error);
        }
        return await User.authDevice(user.id, deviceId, deviceName, userAgent, IP);
        // TODO: getBalance BonusProgram
    },
    async authDevice(userId, deviceId, deviceName, userAgent, IP) {
        let userDevice = await UserDevice.findOrCreate({ id: deviceId }, { id: deviceId, user: userId, name: deviceName });
        // Need pass sessionId here for except parallels login with one name
        return await UserDevice.updateOne({ id: userDevice.id }, { loginTime: Date.now(), isLoggedIn: true, lastIP: IP, userAgent: userAgent, sessionId: (0, uuid_1.v4)() });
    },
    /**
      check all active bonus programs for user
    */
    async checkRegisteredInBonusPrograms(userId) {
        let user = await User.findOne({ id: userId });
        if (!user)
            throw `User not found`;
        const bps = await BonusProgram.getAvailable();
        for (let bp of bps) {
            let adapter = await BonusProgram.getAdapter(bp.adapter);
            const userBonusProgram = await UserBonusProgram.findOne({ user: user.id, bonusProgram: bp.id });
            // If all works
            if (adapter.isRegistered(user) && userBonusProgram && userBonusProgram.isActive) {
                // Not need await finish sync
                UserBonusProgram.sync(userId, bp.id);
                // If not registered in internal storage
            }
            else if (adapter.isRegistered(user) && !userBonusProgram) {
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
            }
            else if (!adapter.isRegistered(user) && bp.automaticUserRegistration) {
                // Registration if Bonus program has an automatic registration option
                await UserBonusProgram.registration(user, bp.adapter);
                // if not need register
            }
            else {
                sails.log.debug(`User should register manual: user[${user.login}], bonusProgram: [${bp.name}]`);
            }
        }
    },
};
module.exports = {
    primaryKey: "id",
    attributes: attributes,
    ...Model,
};
