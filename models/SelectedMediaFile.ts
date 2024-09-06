import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";
import { OptionalAll } from "../interfaces/toolsTS";
import { MediaFileRecord } from "./MediaFile";
import { GroupRecord } from "./Group";
import { DishRecord } from "./Dish";

let attributes = {
  id: {
    type: "number",
    autoIncrement: true,
  } as unknown as number,

  /** 
   * Sort order
   * */
  sortOrder: "number" as unknown as number,

  /** MediaFile reference */
  mediaFile_dish: {
    model: 'mediafile',
    via: 'dish'
  } as unknown as MediaFileRecord  | string,

  mediafile_group: {
    model: 'mediafile',
    via: 'group'
  } as unknown as MediaFileRecord | string,

  /** Group relation */
  group: {
    model: "group",
    via: "images"
  } as unknown as GroupRecord | string,

  /** Dish relation */
  dish: {
    model: "dish",
    via: "images"
  } as unknown as DishRecord | string,
};

type attributes = typeof attributes;
export interface SelectedMediaFileRecord extends OptionalAll<attributes>, ORM { }

let Model = {
  beforeCreate(imageInit: SelectedMediaFileRecord, cb: (err?: string) => void) {
    if(imageInit.sortOrder === null || imageInit.sortOrder === undefined) imageInit.sortOrder = 0;
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
