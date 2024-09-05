import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";
import { WorkTime } from "@webresto/worktime";
declare let attributes: {
    id: string;
    title: string;
    address: string;
    order: number;
    phone: string;
    enable: boolean;
    worktime: WorkTime;
    isPickupPoint: boolean;
    isCookingPoint: boolean;
    isSalePoint: boolean;
    customData: any;
};
type attributes = typeof attributes;
export interface PlaceRecord extends attributes, ORM {
}
declare let Model: {
    beforeCreate(placeInit: PlaceRecord, cb: (err?: string) => void): void;
};
declare global {
    const Place: typeof Model & ORMModel<PlaceRecord, null>;
}
export {};
