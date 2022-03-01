import ORM from "../interfaces/ORM";
import ORMModel from "../interfaces/ORMModel";
declare let attributes: {
    id: string;
    title: string;
    address: string;
    order: number;
    phone: string;
    enable: boolean;
    worktime: any;
    isPickupPoint: boolean;
    isCookingPoint: boolean;
    isSalePoint: boolean;
    customData: any;
};
declare type attributes = typeof attributes;
interface Place extends attributes, ORM {
}
export default Place;
declare let Model: {
    beforeCreate(placeInit: any, next: any): void;
};
declare global {
    const Place: typeof Model & ORMModel<Place>;
}
