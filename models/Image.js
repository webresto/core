"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
let attributes = {
    /** ID картинки */
    id: {
        type: "string",
    },
    /** Данные о картинках, что содержит данная модель */
    images: "json",
    /** Блюдо, которому принадлежит картинка */
    dish: {
        collection: "dish",
        via: "images",
    },
    /** Порядок сортировки */
    order: "number",
    /** */
    group: {
        collection: "group",
        via: "images",
    },
    /** Группа, которой принажлежит картинка */
    uploadDate: "string",
};
let Model = {
    beforeCreate(imageInit, next) {
        if (!imageInit.id) {
            imageInit.id = uuid_1.v4();
        }
        next();
    },
};
module.exports = {
    primaryKey: "id",
    attributes: attributes,
    ...Model,
};
