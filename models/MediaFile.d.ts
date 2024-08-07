import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";
import Dish from "./Dish";
import Group from "./Group";
import { OptionalAll } from "../interfaces/toolsTS";
declare let attributes: {
    /** ID */
    id: string;
    /** Type of media content */
    type: "video" | "image" | "sound";
    /** Video/Photo items */
    /** Image items */
    images: any;
    original: string;
    /** Dish relation */
    dish: Dish[];
    /** Sort order */
    sortOrder: number;
    /** Group relation */
    group: Group[];
    /** upload date
     * @deprecated (del in v2)
    */
    uploadDate: string;
};
type attributes = typeof attributes;
interface MediaFile extends OptionalAll<attributes>, ORM {
}
export type IMediaFile = MediaFile;
export default MediaFile;
export type IMediaFile = MediaFile;
declare let Model: {
    beforeCreate(imageInit: any, cb: (err?: string) => void): void;
    afterDestroy(mf: MediaFile, cb: (err?: any) => void): Promise<void>;
};
declare global {
    const MediaFile: typeof Model & ORMModel<MediaFile, null>;
}
