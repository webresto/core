import { ORMModel } from "../interfaces/ORMModel";
import ORM from "../interfaces/ORM";
import { WorkTime } from "@webresto/worktime";
declare let attributes: {
    /** id */
    id: string;
    /** title of maintenance */
    title: string;
    /** description of maintenance (maybe HTML) */
    description: string;
    /**
     * is active flag */
    enable: boolean;
    worktime: WorkTime;
    startDate: string;
    stopDate: string;
};
type attributes = typeof attributes;
export interface MaintenanceRecord extends attributes, ORM {
}
declare let Model: {
    afterCreate: (maintenance: MaintenanceRecord, cb: (err?: string) => void) => void;
    afterUpdate: (maintenance: MaintenanceRecord, cb: (err?: string) => void) => void;
    afterDestroy: (maintenance: MaintenanceRecord, cb: (err?: string) => void) => void;
    beforeCreate: (maintenance: MaintenanceRecord, cb: (err?: string) => void) => void;
    siteIsOff: () => Promise<boolean>;
    getActiveMaintenance: (date?: string) => Promise<MaintenanceRecord>;
};
declare global {
    const Maintenance: typeof Model & ORMModel<MaintenanceRecord, null>;
}
export {};
