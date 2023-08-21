import CaptchaAdapter from "../CaptchaAdapter";
import { CaptchaJob, ResolvedCaptcha } from "../CaptchaAdapter";
export declare class POW extends CaptchaAdapter {
    getJob(label: string): Promise<CaptchaJob>;
    check(resolvedCaptcha: ResolvedCaptcha, label: string): Promise<boolean>;
}
