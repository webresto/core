import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";

import { v4 as uuid } from "uuid";
import { OptionalAll } from "../interfaces/toolsTS";
import * as fs from "fs"
import { DishRecord } from "./Dish";
import { GroupRecord } from "./Group";

let attributes = {
  /** ID */
  id: {
    type: "string",
    //required: true,
  } as unknown as string,

  /** Type of media content */
  type: {
   type: "string",
   isIn: ['video', 'image', 'audio']
  } as unknown as "video" | "image" | "audio",

  /** Image items: the variant name and its local path */
  variant: "json" as unknown as {[key: string]: string | undefined} ,

  /** It means Original URL http:// or file:// */
  original: "string",
  
  /** It means locale copy of original file */
  originalFilePath: "string",

  /** relations */
  dish: {
    collection: "dish",
    via: "mediafile_dish",
    through: 'selectedmediafile'
  } as unknown as DishRecord[] | string [],

  /** Group relation */
  group: {
    collection: "group",
    via: "mediafile_group",
    through: 'selectedmediafile'
  } as unknown as GroupRecord[] | string [],

  /** upload date */
    uploadDate: "string",
};
type attributes = typeof attributes;

export interface MediaFileRecord extends OptionalAll<attributes>, ORM { }

let Model = {
  beforeCreate(imageInit: MediaFileRecord, cb: (err?: string) => void) {
    if (!imageInit.id) {
      imageInit.id = uuid();
    }
    cb();
  },

  async afterDestroy(mf: MediaFileRecord, cb: (err?: string | Error) => void) {
    try {
      const variant = mf.variant ?? {};

      for (const key in variant) {
        const filePath = variant[key] as string;
        try {
          await fs.promises.access(filePath, fs.constants.F_OK);
          await fs.promises.unlink(filePath);
          sails.log.debug(`MF destroy > ${filePath} file was deleted`);
        } catch (error) {
          if (error.code === 'ENOENT') {
            sails.log.debug(`MF destroy > ${filePath} does not exist`);
            continue;
          }
          throw error;
        }
      }
    } catch (error) {
      return cb(error);
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
  const MediaFile: typeof Model & ORMModel<MediaFileRecord, null>;
}
