import ORMModel from "../interfaces/ORMModel";
import ORM from "../interfaces/ORM";
import { WorkTime } from "@webresto/worktime";
declare let attributes: {
    /** id */
    id: string;
    /** title of maintenance */
    title: string;
    /** description of maintenance (maybe HTML) */
    description: string;
    /** is active flag */
    enable: boolean;
    worktime: WorkTime;
    startDate: string;
    stopDate: string;
};
type attributes = typeof attributes;
interface Maintenance extends attributes, ORM {
}
export default Maintenance;
declare let Model: {
    afterCreate: (maintenance: any, next: any) => void;
    afterUpdate: (maintenance: any, next: any) => void;
    afterDestroy: (maintenance: any, next: any) => void;
    beforeCreate: (maintenance: any, next: any) => void;
    siteIsOff: () => Promise<boolean>;
    getActiveMaintenance: () => Promise<Maintenance>;
};
declare global {
    const Maintenance: typeof Model & ORMModel<Maintenance, null>;
}
