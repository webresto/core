"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateUUID = exports.generateRandomString = void 0;
/**
 * Returns the hash of a string
 * @param str - string to hash
 */
const crypto = require("crypto");
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
    const uuid = [];
    const hex = '0123456789abcdef';
    for (let i = 0; i < 36; i++) {
        uuid[i] = hex[(Math.random() * 16) | 0];
    }
    uuid[14] = '4'; // Set version 4
    uuid[19] = hex[(uuid[19] & 0x3) | 0x8]; // Set variant
    uuid[8] = uuid[13] = uuid[18] = uuid[23] = '-';
    return uuid.join('');
}
exports.generateUUID = generateUUID;
