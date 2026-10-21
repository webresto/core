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
  mediafile_dish: {
    model: 'mediafile'
  } as unknown as MediaFileRecord  | string,

  mediafile_group: {
    model: 'mediafile'
  } as unknown as MediaFileRecord | string,

  /** Group relation */
  group: {
    model: "group"
  } as unknown as GroupRecord | string,

  /** Dish relation */
  dish: {
    model: "dish"
  } as unknown as DishRecord | string,
};

type attributes = typeof attributes;
export interface SelectedMediaFileRecord extends OptionalAll<attributes>, ORM { }

let Model = {
  beforeCreate(imageInit: SelectedMediaFileRecord, cb: (err?: string) => void) {
    if(imageInit.sortOrder === null || imageInit.sortOrder === undefined) imageInit.sortOrder = 0;
    cb();
  },

  // a storefront asks the product or the group again: its photos changed. Every writer of the photos (the media
  // manager, the RMS, MCP) relinks them - a new order is new rows - so the rows are never updated
  afterCreate(record: SelectedMediaFileRecord, cb: (err?: string) => void) {
    emitter.emit("core:selected-media-file-changed", record);
    cb();
  },

  afterDestroy(record: SelectedMediaFileRecord, cb: (err?: string) => void) {
    emitter.emit("core:selected-media-file-changed", record);
    cb();
  },
};

module.exports = {
  primaryKey: "id",
  attributes: attributes,
  ...Model,
};

declare global {
  const SelectedMediaFile: typeof Model & ORMModel<SelectedMediaFileRecord, null>;
}
