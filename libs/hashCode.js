"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Returns the hash of a string
 * @param str - string to hash
 */
const crypto = require("crypto");
function hashCode(str) {
    return crypto.createHash("sha256").update(str).digest("hex");
}
exports.default = hashCode;
