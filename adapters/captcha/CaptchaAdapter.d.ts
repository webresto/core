/**
 * An abstract Captcha adapter class. Used to create new Captcha adapters.
 */
export declare type CaptchaJob = {
    id: string;
    task: string | number;
};
export declare type TaskStorage = {
    [key: string]: {
        task: CaptchaJob;
        time: number;
        [key: string]: string | boolean | number | any;
    };
};
export default abstract class CaptchaAdapter {
    static taskStorage: TaskStorage;
    /**
     * get work for captcha
     */
    abstract getJob(): Promise<CaptchaJob>;
    /**
     * check results
     */
    abstract check(id: string, result: string): Promise<boolean>;
}
