import OneTimePassword from "../../models/OneTimePassword"
export default abstract class OTPAdapter {
  /** Send OTP to user by LOGIN_FIELD */
  public abstract get(login: string): Promise<OneTimePassword>;
}
