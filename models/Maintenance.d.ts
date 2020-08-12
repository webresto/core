import ORMModel from "../modelsHelp/ORMModel";
import ORM from "../modelsHelp/ORM";
export default interface Maintenance extends ORM {
    id: number;
    title: string;
    description: string;
    enable: boolean;
    startDate: string;
    stopDate: string;
}
export interface MaintenanceModel extends ORMModel<Maintenance> {
}
declare global {
    const Maintenance: MaintenanceModel;
}
