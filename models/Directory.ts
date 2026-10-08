import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";
import { v4 as uuid } from "uuid";
import { RequiredField } from "../interfaces/toolsTS";

let attributes = {
  /** ID */
  id: {
    type: "string",
  } as unknown as string,

  /** Name of directory */
  name: "string",

  /** Slug of directory */
  slug: "string",
};

type attributes = typeof attributes;

interface Directory extends RequiredField<Partial<attributes>, "name" | "slug">, ORM {}
export interface DirectoryRecord extends RequiredField<Partial<attributes>, "name" | "slug">, ORM {}

let Model = {
  beforeCreate(directoryInit: DirectoryRecord, cb: (err?: string) => void) {
    if (!directoryInit.id) {
      directoryInit.id = uuid();
    }
    cb();
  },
};

module.exports = {
  primaryKey: "id",
  attributes: attributes,
  ...Model,
};

declare global {
  const Directory: typeof Model & ORMModel<DirectoryRecord, null>;
}