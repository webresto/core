import ORM from "../interfaces/ORM";
import ORMModel from "../interfaces/ORMModel";
import Dish from "./Dish";
import Group from "./Group";
import { OptionalAll } from "../interfaces/toolsTS";
declare let attributes: {
    /** ID */
    id: string;
    /** Type of media content */
    /** Video/Photo items */
    /** Image items */
    images: any;
    original: string;
    /** Dish relation */
    dish: Dish[];
    /** Sort order */
    order: number;
    /** Group relation */
    group: Group[];
    /** upload date */
    uploadDate: string;
};
declare type attributes = typeof attributes;
interface MediaFile extends OptionalAll<attributes>, ORM {
}
export default MediaFile;
declare let Model: {
    beforeCreate(imageInit: any, next: any): void;
};
declare global {
    const MediaFile: typeof Model & ORMModel<MediaFile, null>;
}
