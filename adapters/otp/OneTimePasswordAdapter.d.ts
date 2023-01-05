export default abstract class OTPAdapter {
    abstract get(login: string): Promise<void>;
}
