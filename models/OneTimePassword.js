"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const NotificationService_1 = require("../libs/NotificationService");
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
    /**
     * Typed notification event for the notifications pipeline. Universal point covering
     * every OTP adapter (they all persist through this model). Detached: a notification
     * problem must not break OTP issuing. The legacy NotificationManager send in the OTP
     * adapter stays as-is until operators migrate to a notification rule for this event.
     * Note: with DEMO_OTP_LOGIN the password may be overridden after create — the demo
     * code then differs from the emitted one; demo-only, acceptable.
     */
    afterCreate(record, cb) {
        void (async () => {
            try {
                const user = await User.findOne({ login: record.login });
                const ttlSec = Math.max(0, Math.round((Number(record.expires || 0) - Date.now()) / 1000));
                await NotificationService_1.NotificationService.emit("user_otp_requested", {
                    recipient: user ? { userId: user.id, user } : {},
                    context: {
                        user: user
                            ? {
                                firstName: user.firstName,
                                lastName: user.lastName,
                                phone: user.phone ? `${user.phone.code || ""}${user.phone.number || ""}` : record.login,
                                email: user.email,
                            }
                            : { phone: record.login },
                        otp: { code: record.password, ttlSec },
                    },
                    // OTP is always user-facing even when the login has no User record yet;
                    // phone-capable channels take the number from context.user.phone.
                    groupTo: "user",
                    meta: { sourceModule: "core/otp", idempotencyKey: `user_otp:${record.id}` },
                });
            }
            catch (error) {
                sails.log.error(`OneTimePassword > user_otp_requested emit failed for login ${record.login}`, error);
            }
        })();
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
            // A correct code proves the user received and read the delivered message, so mark
            // the notification(s) emitted for this OTP (idempotencyKey `user_otp:<id>`, see
            // afterCreate) as read. Best-effort: a notifications problem must not block login.
            try {
                // `(globalThis as any).Notification` references the Sails model, not the
                // browser-global Notification type pulled in by lib "DOM" (same trick as
                // NotificationDispatcher).
                await globalThis.Notification.update({ idempotencyKey: `user_otp:${OTP.id}`, status: { "!=": "read" } }, { status: "read", readAt: Date.now() }).fetch();
            }
            catch (error) {
                sails.log.warn(`OneTimePassword > failed to mark OTP notification read for id ${OTP.id}`, error);
            }
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
    if ((process.env.DEMO_MODE || "").toLowerCase() === "true") {
        return "999999";
    }
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
