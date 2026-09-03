import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";
import { WorkTime } from "@webresto/worktime";
export interface PlaceCoordinate {
    lat: number;
    lng: number;
}
declare let attributes: {
    id: string;
    /** Terminal or department identifier in the RMS. Empty until an RMS maps this point. */
    rmsId: string;
    title: string;
    address: string;
    order: number;
    phone: string;
    enable: boolean;
    worktime: WorkTime;
    isPickupPoint: boolean;
    isCookingPoint: boolean;
    isSalePoint: boolean;
    /** Geographic position of the point. Required only by geo/route kitchen modes. */
    coordinate: PlaceCoordinate | null;
    customData: any;
};
type attributes = typeof attributes;
export interface PlaceRecord extends attributes, ORM {
}
declare let Model: {
    beforeCreate(placeInit: PlaceRecord, cb: (err?: string) => void): void;
    beforeUpdate(placeUpdate: Partial<PlaceRecord>, cb: (err?: string) => void): void;
};
declare global {
    const Place: typeof Model & ORMModel<PlaceRecord, never>;
}
export {};
