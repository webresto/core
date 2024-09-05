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
    mediaFile: MediaFileRecord;
    /** Group relation */
    group: GroupRecord | string;
    /** Dish relation */
    dish: DishRecord | string;
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
