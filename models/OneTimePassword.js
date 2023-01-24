"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
let attributes = {
    /** ID */
    id: {
        type: "number",
        autoIncrement: true,
    },
    /**
     * relation by LOGIN_FIELD setting
     */
    login: {
        type: 'string',
        required: true
    },
    password: 'string',
    expires: 'number'
};
let Model = {
    beforeCreate(record, next) {
        if (!record.password) {
            record.password = generateOtp();
        }
        if (!record.expires) {
            record.expires = Date.now() + 30 * 60 * 1000; // 30 minutes
        }
        next();
    },
    async check(login, password) {
        // Clean expired
        await OneTimePassword.destroy({ expires: { "<": Date.now() } });
        let OTP = await OneTimePassword.findOne({ login: login }).sort('createdAt DESC');
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
    var digits = '1234567890';
    var otp = '';
    for (let i = 0; i < 6; i++) {
        otp += digits[Math.floor(Math.random() * 10)];
    }
    return otp;
}
