import CaptchaAdapter from "../CaptchaAdapter";
import { CaptchaJob } from "../CaptchaAdapter";
export declare class POW extends CaptchaAdapter {
    getJob(): Promise<CaptchaJob>;
    check(id: string, solution: string): Promise<boolean>;
}
