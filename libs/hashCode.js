"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateUUID = exports.generateRandomString = void 0;
/**
 * Returns the hash of a string
 * @param str - string to hash
 */
const crypto = require("crypto");
const uuid_1 = require("uuid");
function hashCode(str) {
    return crypto.createHash("sha256").update(str).digest("hex");
}
exports.default = hashCode;
function generateRandomString(length) {
    const bytes = crypto.randomBytes(Math.ceil(length / 2));
    return bytes.toString('hex').slice(0, length);
}
exports.generateRandomString = generateRandomString;
function generateUUID() {
    return (0, uuid_1.v4)();
}
exports.generateUUID = generateUUID;
