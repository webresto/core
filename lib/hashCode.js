"use strict";
exports.__esModule = true;
function hashCode(str) {
    var hash = 0;
    if (str.length === 0)
        return hash;
    for (var i = 0; i < str.length; i++) {
        var chr = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + chr;
        hash |= 0;
    }
    return hash;
}
exports["default"] = hashCode;
