// todo: fix types model instance to {%ModelName%}Record for OneTimePassword";

import { OneTimePasswordRecord } from "../../models/OneTimePassword";

export default abstract class OTPAdapter {
  /** Send OTP to user by CORE_LOGIN_FIELD */
  public abstract get(login: string): Promise<OneTimePasswordRecord>;
}
