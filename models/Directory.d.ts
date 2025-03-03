import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";
import { RequiredField } from "../interfaces/toolsTS";
declare let attributes: {
    /** ID */
    id: string;
    /** Name of directory */
    name: string;
    /** Slug of directory */
    slug: string;
};
type attributes = typeof attributes;
export interface DirectoryRecord extends RequiredField<Partial<attributes>, "name" | "slug">, ORM {
}
declare let Model: {
    beforeCreate(directoryInit: DirectoryRecord, cb: (err?: string) => void): void;
};
declare global {
    const Directory: typeof Model & ORMModel<DirectoryRecord, null>;
}
export {};
