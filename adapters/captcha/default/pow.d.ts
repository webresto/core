import CaptchaAdapter from "../CaptchaAdapter";
import { CaptchaJob } from "../CaptchaAdapter";
export declare class POW extends CaptchaAdapter {
    getJob(label: string): Promise<CaptchaJob>;
    check(id: string, solution: string, label: string): Promise<boolean>;
}
