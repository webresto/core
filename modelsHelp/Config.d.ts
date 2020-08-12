import ImageConfig from "../adapter/image/ImageConfig";
import { Time } from "../modelsHelp/Cause";
export default interface Config {
    project: string;
    city: string;
    timezone: string;
    project_slug: string;
    websiteDomain: string;
    orderPage: string;
    timeSyncBalance: number;
    timeSyncMenu: number;
    timeSyncStreets: number;
    checkType: string;
    groupShift: string;
    rmsAdapter: string;
    images: ImageConfig;
    prefix: string;
    email?: {
        server: {
            user: string;
            password: string;
            host: string;
            ssl: boolean;
        };
        template: string;
    };
    map: {
        geocode: string;
        customMaps: string;
        check: string;
        api: string;
        customMap: string;
        distance: string;
    };
    timeSyncMap: number;
    zoneDontWork?: string;
    deliveryWorkTime: Time[];
    phoneRegex?: string;
    nameRegex?: string;
    check: {
        requireAll: boolean;
        notRequired: boolean;
    };
    order: {
        requireAll: boolean;
        notRequired: boolean;
    };
    zoneNotFound?: string;
    comment?: string;
    orderFail: string;
    notInZone: string;
    awaitEmitterTimeout?: number;
}
