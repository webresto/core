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
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
