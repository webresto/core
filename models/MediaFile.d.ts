import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";
import { OptionalAll } from "../interfaces/toolsTS";
import { DishRecord } from "./Dish";
import { GroupRecord } from "./Group";
declare let attributes: {
    /** ID */
    id: string;
    /** Type of media content */
    type: "video" | "image" | "sound";
    /**
     * @deprecated use variant field
     * TODO: delete in ver 3
     * Image items */
    images: {
        [key: string]: string;
    };
    /**
     * variants is just an array containing the variant name and its local path
     * clone from images
     * This is automatically cloned from images and vice versa
     * Image items */
    variant: {
        [key: string]: string;
    };
    original: string;
    /** relations */
    dish: string[] | DishRecord[];
    /** Group relation */
    group: string[] | GroupRecord[];
    /** upload date
     * @deprecated (del in v2)
     */
    uploadDate: string;
};
type attributes = typeof attributes;
/** @deprecated use `MediaFileRecord` */
export type IMediaFile = OptionalAll<attributes>;
export interface MediaFileRecord extends OptionalAll<attributes>, ORM {
}
declare let Model: {
    beforeCreate(imageInit: MediaFileRecord, cb: (err?: string) => void): void;
    beforeUpdate(imageInit: MediaFileRecord, cb: (err?: string) => void): void;
    afterDestroy(mf: MediaFileRecord, cb: (err?: string | Error) => void): Promise<void>;
};
declare global {
    const MediaFile: typeof Model & ORMModel<MediaFileRecord, null>;
}
export {};
