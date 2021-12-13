import ORMModel from "../interfaces/ORMModel";
import ORM from "../interfaces/ORM";
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
declare type attributes = typeof attributes;
interface Maintenance extends attributes, ORM {
}
export default Maintenance;
declare let Model: {
    beforeCreate: (paymentMethod: any, next: any) => void;
    siteIsOff: () => unknown;
    getActiveMaintenance: () => unknown;
};
declare global {
    const Maintenance: typeof Model & ORMModel<Maintenance>;
}
