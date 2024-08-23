"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
const fs = require("fs");
let attributes = {
    /** ID */
    id: {
        type: "string",
        //required: true,
    },
    /** Type of media content */
    type: {
        type: "string",
        isIn: ['video', 'image', 'sound']
    },
    /** Video/Photo items */
    //content: "json" as unknown as any,
    // DEPRECATED use content instead
    /** Image items */
    images: "json",
    original: "string",
    /** Dish relation */
    dish: {
        collection: "dish",
        via: "images",
    },
    /** Sort order */
    sortOrder: "number",
    /** Group relation */
    group: {
        collection: "group",
        via: "images",
    },
    /** upload date
     * @deprecated (del in v2)
    */
    uploadDate: "string",
};
// export default IMediaFile;
let Model = {
    beforeCreate(imageInit, cb) {
        if (!imageInit.id) {
            imageInit.id = (0, uuid_1.v4)();
        }
        cb();
    },
    async afterDestroy(mf, cb) {
        try {
            const images = mf.images;
            const keys = Object.keys(images);
            for (const key of keys) {
                const filePath = images[key];
                try {
                    await fs.promises.access(filePath, fs.constants.F_OK);
                    await fs.promises.unlink(filePath);
                    sails.log.debug(`MF destroy > ${filePath} file was deleted`);
                }
                catch (error) {
                    if (error.code === 'ENOENT') {
                        sails.log.debug(`MF destroy > ${filePath} does not exist`);
                        continue;
                    }
                    throw error;
                }
            }
        }
        catch (error) {
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
