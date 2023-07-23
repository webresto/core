import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";

import Dish from "./Dish";
import Group from "./Group";
import { v4 as uuid } from "uuid";
import { OptionalAll } from "../interfaces/toolsTS";

let attributes = {
  /** ID */
  id: {
    type: "string",
    //required: true,
  } as unknown as string,


  /** Type of media content */
  //type: {
  //  type: "string",
  //  isIn: ['video', 'image']
  //} as unknown as "video" | "image",
  
  /** Video/Photo items */
  //content: "json" as unknown as any,

  // DEPRECATED use content instead
  /** Image items */
  images: "json" as unknown as any,


  
  original: "string",
  /** Dish relation */
  dish: {
    collection: "dish",
    via: "images",
  } as unknown as Dish[],

  /** Sort order */
  sortOrder: "number" as unknown as number,

  /** Group relation */
  group: {
    collection: "group",
    via: "images",
  } as unknown as Group[],

  /** upload date 
   * @deprecated (del in v2)
  */
  uploadDate: "string",
};
type attributes = typeof attributes;
interface MediaFile extends OptionalAll<attributes>, ORM {}
export default MediaFile;

let Model = {
  beforeCreate(imageInit: any, cb:  (err?: string) => void) {
    if (!imageInit.id) {
      imageInit.id = uuid();
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
  //@ts-ignore //TODO: need rename model of images maybe ProductCover
  const MediaFile: typeof Model & ORMModel<MediaFile, null>;
}
