import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";
import { v4 as uuid } from "uuid";
import { OptionalAll } from "../interfaces/toolsTS";
import { MediaFileRecord } from "./MediaFile";

let attributes = {
  /** ID */
  id: {
    type: "string",
    //required: true,
  } as unknown as string,

  /** 
   * Sort order
   * */
  sortOrder: "number" as unknown as number,

  /** MediaFile reference */
  mediaFile: {
    model: 'mediafile',
    required: true,
  } as unknown as MediaFileRecord,
};

type attributes = typeof attributes;
export interface SelectedMediaFileRecord extends OptionalAll<attributes>, ORM { }

let Model = {
  beforeCreate(imageInit: SelectedMediaFileRecord, cb: (err?: string) => void) {
    if (!imageInit.id) {
      imageInit.id = uuid();
    }

    cb();
  }
};

module.exports = {
  primaryKey: "id",
  attributes: attributes,
  ...Model,
};

declare global {
  const SelectedMediaFile: typeof Model & ORMModel<SelectedMediaFileRecord, null>;
}
