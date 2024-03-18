import OneTimePassword from "../../models/OneTimePassword";
export default abstract class OTPAdapter {
    /** Send OTP to user by CORE_LOGIN_FIELD */
    abstract get(login: string): Promise<OneTimePassword>;
}
