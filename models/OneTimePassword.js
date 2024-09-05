"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
let attributes = {
    /** ID */
    id: {
        type: "number",
        autoIncrement: true,
    },
    /**
     * relation by CORE_LOGIN_FIELD setting
     */
    login: {
        type: 'string',
        required: true
    },
    password: 'string',
    expires: 'number'
};
let Model = {
    beforeCreate(record, cb) {
        if (!record.password) {
            record.password = generateOtp();
        }
        if (!record.expires) {
            record.expires = Date.now() + 30 * 60 * 1000; // 30 minutes
        }
        cb();
    },
    async check(login, password) {
        // Clean expired
        await OneTimePassword.destroy({ expires: { "<": Date.now() } }).fetch();
        if (process.env.NODE_ENV !== "production" && process.env.DEFAULT_OTP === password) {
            return true;
        }
        let OTP = (await OneTimePassword.find({ login: login }).sort('createdAt DESC'))[0];
        if (OTP === undefined)
            return false;
        if (password === OTP.password) {
            await OneTimePassword.destroy({ id: OTP.id });
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
function generateOtp() {
    if (process.env.NODE_ENV !== "production" && process.env.DEFAULT_OTP) {
        return process.env.DEFAULT_OTP;
    }
    let digits = '1234567890';
    let otp = '';
    for (let i = 0; i < 6; i++) {
        otp += digits[Math.floor(Math.random() * 10)];
    }
    return otp;
}
