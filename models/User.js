"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
const bcryptjs = require("bcryptjs");
const Countries = require("../libs/dictionaries/countries.json");
let attributes = {
    /** ID */
    id: {
        type: "string",
        isNotEmptyString: true,
        unique: true
    },
    firstName: {
        type: 'string',
        required: true
    },
    lastName: {
        type: 'string',
        allowNull: true,
        isNotEmptyString: true
    },
    email: {
        type: 'string',
        isEmail: true
    },
    /**
     * Its a basic login field
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
            // Check dictonary
            let isCounryCode = false;
            for (let country of Countries) {
                if (phone.code === country.phoneCode)
                    isCounryCode = true;
            }
            if (typeof phone.code !== "string" || typeof phone.number !== "string" || typeof phone.number !== "string" || isCounryCode === false)
                return false;
            return true;
        }
    },
    birthday: {
        type: 'string',
        isAfter: new Date('Sat Jan 1 1900 00:00:00 GMT-0000'),
        // isBefore: new Date().setFullYear(new Date().getFullYear()-10)
    },
    favorites: {
        collection: 'dish'
    },
    bonusProgram: {
        collection: 'userbonusprogram',
    },
    history: {
        collection: 'order',
    },
    locations: {
        collection: 'UserLocation',
        via: 'user'
    },
    devices: {
        collection: 'UserDevice',
        via: 'user'
    },
    verified: {
        type: 'boolean'
    },
    passwordHash: {
        type: 'string',
        isNotEmptyString: true
    },
    lastPasswordChange: {
        type: 'string',
        // isAfter: new Date('Sat Jan 1 2023 00:00:00 GMT-0000'),
    },
    /** Its temporary code for authorization */
    temporaryCode: {
        type: 'string',
        allowNull: true
    },
    /**
     * UserGroup (new, best.... )
     * Its Idea for making different promo for users
     */
    // group:  "string",
    /** Mark as kitchen worker
     * its idea for making delivery message for Employers
     * */
    // isEmployee: { 
    //   type:'boolean'
    // } as unknown as boolean,
    isDeleted: {
        type: 'boolean'
    },
    customData: "json",
};
let Model = {
    beforeCreate(userInit, next) {
        if (!userInit.id) {
            userInit.id = (0, uuid_1.v4)();
        }
        if (!userInit.isDeleted)
            userInit.isDeleted = false;
        if (!userInit.verified)
            userInit.verified = false;
        next();
    },
    /**
     * Returns phone string by user criteria
     * Additional number will be added separated by commas (+19990000000,1234)
     * @param {WaterlineCriteria} criteria
     * @returns String
     */
    async getPhoneString(criteria) {
        let user = await User.findOne(criteria);
        if (user) {
            return `${user.phone.code}${user.phone.number}${user.phone.additionalNumber ? ',' + user.phone.additionalNumber : ''}`;
        }
        else {
            throw `User not found`;
        }
    },
    /**
     * Update user password
     *
     * @param userId User id
     * @param newPassword New password
     * @param oldPassword Old Password
     * @param force Skip check old password
     *
     *
     * @setting PasswordSalt - Password salt (default: number42)
     * @setting PasswordRegex - Checking password by regex (default: no check)
     * @setting PasswordMinLength - Checks minimum length password (default: no check)
     *
     * Note: node -e "console.log(require('bcryptjs').hashSync(process.argv[1], "number42"));" your-password-here
     */
    async setPassword(userId, newPassword, oldPassword, force = false, temporaryCode) {
        let paswordRegex = await Settings.get("PasswordRegex");
        let passwordMinLength = await Settings.get("PasswordMinLength");
        if (!userId || !newPassword)
            throw 'UserId and newPassword is required';
        if (Number(passwordMinLength) && newPassword.length < Number(passwordMinLength))
            throw `Password less than minimum length`;
        if (paswordRegex && !newPassword.match(paswordRegex))
            throw `Password not match with regex`;
        // salt
        let salt = await Settings.get("PasswordSalt");
        if (!salt)
            salt = 8;
        let user = await User.findOne({ id: userId });
        /**
         * If not force, it should check new/old paswords
         * If user not have oldPassword
         */
        if (!force) {
            if (user.passwordHash) {
                if (!oldPassword)
                    throw 'oldPassword is required';
                if (!await bcryptjs.compare(oldPassword, user.passwordHash)) {
                    throw `Old pasword not accepted`;
                }
            }
            else if (temporaryCode) {
                let login = await User.getPhoneString({ id: userId });
                if (!await OneTimePassword.check(login, temporaryCode)) {
                    throw `Temporary code not match`;
                }
            }
        }
        let passwordHash = bcryptjs.hashSync(newPassword, salt);
        return await User.updateOne({ id: user.id }, { passwordHash: passwordHash, lastPasswordChange: new Date().toISOString() });
    },
    async login(login, password, temporaryCode) {
        return;
    },
    async authDevice() {
        return;
    }
};
module.exports = {
    primaryKey: "id",
    attributes: attributes,
    ...Model,
};
