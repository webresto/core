"use strict";
exports.__esModule = true;
var Point = (function () {
    function Point(x, y) {
        this.x = x;
        this.y = y;
    }
    Point.prototype.toString = function () {
        return this.x + ' ' + this.y + ', ';
    };
    return Point;
}());
exports["default"] = Point;
