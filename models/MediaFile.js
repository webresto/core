"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
const fs = __importStar(require("fs"));
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
    original: "string",
    /** relations */
    dish: {
        collection: "dish",
        via: "mediaFile_dish",
        through: 'selectedmediafile'
    },
    /** Group relation */
    group: {
        collection: "group",
        via: "mediafile_group",
        through: 'selectedmediafile'
    },
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
