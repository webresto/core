export default abstract class OTPAdapter {
  public abstract get(login: string): Promise<void>;
}
