import ORM from "../modelsHelp/ORM";
import ORMModel from "../modelsHelp/ORMModel";
import Config from "../modelsHelp/Config";
export default interface SystemInfo extends ORM {
    id: number;
    key: string;
    value: string;
    section: string;
}
declare type config = typeof sails.config;
export interface SystemInfoModel extends ORMModel<SystemInfo> {
    use<T extends keyof Config>(key: T): Promise<PropType<Config, T>>;
    use<T extends keyof config[U], U extends keyof config>(config: U, key: T): Promise<PropType<config[U], T>>;
    use(key: string): Promise<any>;
    use(config: string, key: string): Promise<any>;
    set(key: string, value: string, config?: string): Promise<any>;
}
declare global {
    const SystemInfo: SystemInfoModel;
}
export {};
