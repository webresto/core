"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateRandomString = void 0;
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
