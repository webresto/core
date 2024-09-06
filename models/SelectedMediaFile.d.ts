import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";
import { OptionalAll } from "../interfaces/toolsTS";
import { MediaFileRecord } from "./MediaFile";
import { GroupRecord } from "./Group";
import { DishRecord } from "./Dish";
declare let attributes: {
    id: number;
    /**
     * Sort order
     * */
    sortOrder: number;
    /** MediaFile reference */
    mediafile_dish: string | MediaFileRecord;
    mediafile_group: string | MediaFileRecord;
    /** Group relation */
    group: string | GroupRecord;
    /** Dish relation */
    dish: string | DishRecord;
};
type attributes = typeof attributes;
export interface SelectedMediaFileRecord extends OptionalAll<attributes>, ORM {
}
declare let Model: {
    beforeCreate(imageInit: SelectedMediaFileRecord, cb: (err?: string) => void): void;
};
declare global {
    const SelectedMediaFile: typeof Model & ORMModel<SelectedMediaFileRecord, null>;
}
export {};
