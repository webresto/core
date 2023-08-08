"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class Polygon {
    _name;
    _description;
    _points;
    constructor(name, description, points) {
        this._name = name;
        this._description = description;
        this._points = points;
    }
    get points() {
        return this._points;
    }
    get name() {
        return this._name;
    }
    get asArray() {
        return this._points.map((point) => [point.x, point.y]);
    }
    toString() {
        return this._points.toString();
    }
}
exports.default = Polygon;
