/**label
 * An abstract Captcha adapter class. Used to create new Captcha adapters.
 */
export declare type CaptchaJob = {
    id: string;
    task: string | number;
};
export declare type ResolvedCaptcha = {
    id: string;
    result: string;
};
export declare type TaskStorage = {
    [key: string]: {
        /** Captcha Job */
        task: CaptchaJob;
        /** Identifies the action for which it was resolved */
        label: string;
        time: number;
        [key: string]: string | boolean | number | any;
    };
};
export default abstract class CaptchaAdapter {
    static taskStorage: TaskStorage;
    /**
     * get work for captcha
     */
    abstract getJob(label: string): Promise<CaptchaJob>;
    /**
     * check results
     */
    abstract check(resolvedCaptcha: ResolvedCaptcha, label: string): Promise<boolean>;
}
