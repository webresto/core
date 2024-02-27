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
    //type: {
    //  type: "string",
    //  isIn: ['video', 'image']
    //} as unknown as "video" | "image",
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
