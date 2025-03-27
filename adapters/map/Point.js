"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Point {
    x;
    y;
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }
    toString() {
        return this.x + " " + this.y + ", ";
    }
}
exports.default = Point;
