import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";
import { OptionalAll } from "../interfaces/toolsTS";
import { DishRecord } from "./Dish";
import { GroupRecord } from "./Group";
declare let attributes: {
    /** ID */
    id: string;
    /** Type of media content */
    type: "video" | "image" | "audio";
    /** Image items: the variant name and its local path */
    variant: {
        [key: string]: string | undefined;
    };
    /** It means Original URL http:// or file:// */
    original: string;
    /** It means locale copy of original file */
    originalFilePath: string;
    /** relations */
    dish: DishRecord[] | string[];
    /** Group relation */
    group: GroupRecord[] | string[];
    /** upload date */
    uploadDate: string;
};
type attributes = typeof attributes;
export interface MediaFileRecord extends OptionalAll<attributes>, ORM {
}
declare let Model: {
    beforeCreate(imageInit: MediaFileRecord, cb: (err?: string) => void): void;
    afterDestroy(mf: MediaFileRecord, cb: (err?: string | Error) => void): Promise<void>;
};
declare global {
    const MediaFile: typeof Model & ORMModel<MediaFileRecord, null>;
}
export {};
