import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";
import { PlaceRecord } from "./Place";
declare let attributes: {
    /** ID */
    id: string;
    /** Id in external system */
    externalId: string;
    /** Name of street */
    name: string;
    slug: string;
    boundingBox: string;
    /**
     * Base URL of the backend serving this city, e.g. `https://api.tyumen.example`.
     * The storefront switches to it when the customer picks the city. Rows are
     * mirrored across servers, so the value is always absolute; null only on a
     * single-server installation where there is nothing to switch to.
     */
    url: string;
    /** City was deleted */
    isDeleted: boolean;
    /** The points that serve this city: what the storefront lists after a city is chosen. */
    places: PlaceRecord[];
    customData: {
        [key: string]: string | boolean | number;
    } | string;
};
type attributes = typeof attributes;
export interface CityRecord extends attributes, ORM {
}
declare let Model: {
    beforeCreate(streetInit: CityRecord, cb: (err?: string) => void): void;
};
declare global {
    const City: typeof Model & ORMModel<CityRecord, null>;
}
export {};
