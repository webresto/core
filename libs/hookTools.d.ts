/**
 * Type for functions that is controllers
 */
export type Action = (req: ReqType, res: ResType) => Promise<any>;
/**
 * Provide tools for hooks. Has only static methods.
 */
export default class HookTools {
    /**
     * Policy array is one for all projects. It isn't assigned with sails policies
     */
    private static policies;
    /**
     * Bind models from folder. Folder must be full path.
     * @param folder - path to models
     */
    static bindModels(folder: string): Promise<void>;
    /**
     * Check that config with a name key exists in sails.config
     * @param key - name of config to check
     * @return true if config exists
     */
    static checkConfig(key: string): boolean;
    /**
     * Bind config from folder. Folder must be full path.
     * @param folder - path to models
     */
    static bindConfig(folder: string): Promise<void>;
    /**
     * Start cb function after given names of hooks. Call error with selfName if one of hooks not found
     * @param selfName - name of hook. Uses for debugging
     * @param hooks - array of names hooks to wait for
     * @param cb - function
     */
    static waitForHooks(selfName: string, hooks: string[], cb: (...args: any[]) => any): void;
    /**
     * Bind function `action` to router `path` with method `method`. Use policies binding from this module.
     * @param path - /path/to/bind
     * @param action - function with Action type
     * @param method - GET or POST ot etc.
     */
    static bindRouter(path: string, action: Action, method?: string): void;
    private static bindPolicy;
    /**
     * Load policies from given folder.
     * The folder must contain index.js file that contains object with {'path/to/': policyName}, where /path/to/ is router or '*'
     * and policyName is one of other file names.
     * For example
     * |
     * * - index.js > module.exports = {
     * |                '/index': 'policy'
     * |              }
     * |
     * * - policy.js > module.exports = function (req, res, next) {
     *                    return next();
     *                 }
     * @param folder - folder where policies load
     */
    static loadPolicies(folder: string): void;
}
