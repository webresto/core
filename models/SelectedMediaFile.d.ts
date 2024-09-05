import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";
import { OptionalAll } from "../interfaces/toolsTS";
import { MediaFileRecord } from "./MediaFile";
declare let attributes: {
    /** ID */
    id: string;
    /**
     * Sort order
     * */
    sortOrder: number;
    /** MediaFile reference */
    mediaFile: MediaFileRecord;
};
type attributes = typeof attributes;
interface SelectedMediaFile extends OptionalAll<attributes>, ORM {
}
export type SelectedMediaFileRecord = OptionalAll<attributes>;
declare let Model: {
    beforeCreate(imageInit: SelectedMediaFileRecord, cb: (err?: string) => void): void;
};
declare global {
    const SelectedMediaFile: typeof Model & ORMModel<SelectedMediaFile, null>;
}
export {};
