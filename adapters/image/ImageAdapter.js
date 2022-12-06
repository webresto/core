"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
class ImageAdapter {
    config;
    constructor(config) {
        config.dish.path = config.dish.path || "";
        config.group.path = config.group.path || "";
        config.dish.format = config.dish.format || "png";
        config.group.format = config.group.format || "png";
        this.config = config;
    }
}
exports.default = ImageAdapter;
