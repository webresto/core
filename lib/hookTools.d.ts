export declare type Action = (req: ReqType, res: ResType) => Promise<any>;
export default class HookTools {
    private static policies;
    static bindModels(folder: string): Promise<void>;
    static checkConfig(key: string): boolean;
    static waitForHooks(selfName: string, hooks: string[], cb: (...args: any[]) => any): void;
    static bindRouter(path: string, action: Action, method?: string): void;
    private static bindPolicy;
    static loadPolicies(folder: string): void;
}
