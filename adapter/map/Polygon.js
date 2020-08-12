"use strict";
exports.__esModule = true;
var Polygon = (function () {
    function Polygon(name, description, points) {
        this._name = name;
        this._description = description;
        this._points = points;
    }
    Object.defineProperty(Polygon.prototype, "points", {
        get: function () {
            return this._points;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Polygon.prototype, "name", {
        get: function () {
            return this._name;
        },
        enumerable: false,
        configurable: true
    });
    Object.defineProperty(Polygon.prototype, "asArray", {
        get: function () {
            return this._points.map(function (point) { return [point.x, point.y]; });
        },
        enumerable: false,
        configurable: true
    });
    Polygon.prototype.toString = function () {
        return this._points.toString();
    };
    return Polygon;
}());
exports["default"] = Polygon;
