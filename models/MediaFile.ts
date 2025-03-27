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

  /** 
   * @deprecated use variant field
   * TODO: delete in ver 3
   * Image items */
  images: "json" as unknown as {[key: string]: string | undefined},

  /** 
   * variants is just an array containing the variant name and its local path
   * clone from images
   * This is automatically cloned from images and vice versa
   * Image items */
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

  /** upload date 
   * @deprecated (del in v2)
   */
    uploadDate: "string",
};
type attributes = typeof attributes;

/** @deprecated use `MediaFileRecord` */
export type IMediaFile = OptionalAll<attributes>;

export interface MediaFileRecord extends OptionalAll<attributes>, ORM { }

let Model = {
  beforeCreate(imageInit: MediaFileRecord, cb: (err?: string) => void) {
    if (!imageInit.id) {
      imageInit.id = uuid();
    }

    /**
     * TODO: delete in ver 3
     */
    if (imageInit.variant && imageInit.images) {
      return cb('variant & image not allowed');
    }
    let variant = {
      ...(imageInit.variant ? { ...imageInit.variant } : {}),
      ...(imageInit.images ? {... imageInit.images } : {})
    };
    imageInit.variant = variant
    imageInit.images = variant
    // 
    cb();
  },


  beforeUpdate(imageInit: MediaFileRecord, cb: (err?: string) => void) {
    /**
     * TODO: delete in ver 3
     */
    if (imageInit.variant && imageInit.images) {
      return cb('variant & image not allowed');
    }
    let variant = {
      ...(imageInit.variant ? { ...imageInit.variant } : {}),
      ...(imageInit.images ? { ... imageInit.images } : {})
    };
    imageInit.variant = variant
    imageInit.images = variant
    // 
    cb();
  },

  async afterDestroy(mf: MediaFileRecord, cb: (err?: string | Error) => void) {
    try {
      let variant: {[key: string]: string} = {
        // TODO:delete in v3
        ...(mf.variant ? { ...mf.variant } : {}),
        ...(mf.images ? { ...mf.images } : {})
      };

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
