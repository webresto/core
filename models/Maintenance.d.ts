import ORMModel from "@webresto/core/modelsHelp/ORMModel";
import ORM from "@webresto/core/modelsHelp/ORM";
/**
 * Описывает модель "работы на сайте"
 */
export default interface Maintenance extends ORM {
    id: number;
    title: string;
    description: string;
    enable: boolean;
    startDate: string;
    stopDate: string;
}
/**
 * Описывает класс Maintenance, используется для ORM
 */
export interface MaintenanceModel extends ORMModel<Maintenance> {
}
declare global {
    const Maintenance: MaintenanceModel;
}
