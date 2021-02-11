"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * Отдаёт хеш строки
 * @param str - строка для хеширования
 */
const crypto = require('crypto');
function hashCode(str) {
    return crypto.createHash('sha256').update(str).digest('hex');
    ;
}
exports.default = hashCode;
