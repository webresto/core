"use strict";
exports.__esModule = true;
var ImageAdapter = (function () {
    function ImageAdapter(config) {
        config.dish.path = config.dish.path || "";
        config.group.path = config.group.path || "";
        config.dish.format = config.dish.format || "png";
        config.group.format = config.group.format || "png";
        this.config = config;
    }
    return ImageAdapter;
}());
exports["default"] = ImageAdapter;
