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
        isIn: ['video', 'image', 'audio']
    },
    /**
     * @deprecated use variant field
     * TODO: delete in ver 3
     * Image items */
    images: "json",
    /**
     * variants is just an array containing the variant name and its local path
     * clone from images
     * This is automatically cloned from images and vice versa
     * Image items */
    variant: "json",
    /** It means Original URL http:// or file:// */
    original: "string",
    /** It means locale copy of original file */
    originalFilePath: "string",
    /** relations */
    dish: {
        collection: "dish",
        via: "mediafile_dish",
        through: 'selectedmediafile'
    },
    /** Group relation */
    group: {
        collection: "group",
        via: "mediafile_group",
        through: 'selectedmediafile'
    },
    /** upload date
     * @deprecated (del in v2)
     */
    uploadDate: "string",
};
let Model = {
    beforeCreate(imageInit, cb) {
        if (!imageInit.id) {
            imageInit.id = (0, uuid_1.v4)();
        }
        /**
         * TODO: delete in ver 3
         */
        if (imageInit.variant && imageInit.images) {
            return cb('variant & image not allowed');
        }
        let variant = {
            ...(imageInit.variant ? { ...imageInit.variant } : {}),
            ...(imageInit.images ? { ...imageInit.images } : {})
        };
        imageInit.variant = variant;
        imageInit.images = variant;
        // 
        cb();
    },
    beforeUpdate(imageInit, cb) {
        /**
         * TODO: delete in ver 3
         */
        if (imageInit.variant && imageInit.images) {
            return cb('variant & image not allowed');
        }
        let variant = {
            ...(imageInit.variant ? { ...imageInit.variant } : {}),
            ...(imageInit.images ? { ...imageInit.images } : {})
        };
        imageInit.variant = variant;
        imageInit.images = variant;
        // 
        cb();
    },
    async afterDestroy(mf, cb) {
        try {
            let variant = {
                // TODO:delete in v3
                ...(mf.variant ? { ...mf.variant } : {}),
                ...(mf.images ? { ...mf.images } : {})
            };
            for (const key in variant) {
                const filePath = variant[key];
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
