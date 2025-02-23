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
exports.fsw = void 0;
const fs = __importStar(require("fs"));
exports.fsw = {
    async writeFile(filePath, data) {
        try {
            await fs.promises.writeFile(filePath, data, 'utf-8');
        }
        catch (error) {
            sails.log.error(`Error writing file ${filePath}:`, error);
            throw error;
        }
    },
    async readFile(filePath) {
        try {
            return await fs.promises.readFile(filePath, 'utf-8');
        }
        catch (error) {
            sails.log.error(`Error reading file ${filePath}:`, error);
            throw error;
        }
    },
    async unlink(filePath) {
        try {
            await fs.promises.unlink(filePath);
        }
        catch (error) {
            sails.log.error(`Error deleting file ${filePath}:`, error);
            throw error;
        }
    },
    async exists(filePath) {
        try {
            await fs.promises.access(filePath, fs.constants.F_OK);
            return true;
        }
        catch {
            return false;
        }
    },
    async mkdir(dirPath) {
        try {
            await fs.promises.mkdir(dirPath, { recursive: true });
        }
        catch (error) {
            sails.log.error(`Error creating directory ${dirPath}:`, error);
            throw error;
        }
    },
    async copyFile(src, dest) {
        try {
            await fs.promises.copyFile(src, dest);
        }
        catch (error) {
            sails.log.error(`Error copying file from ${src} to ${dest}:`, error);
            throw error;
        }
    }
};
