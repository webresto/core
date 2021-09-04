"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
let attributes = {
    /** ID картинки */
    id: {
        type: 'string',
        required: true,
        defaultsTo: function () { return uuid_1.v4(); }
    },
    /** Данные о картинках, что содержит данная модель */
    images: 'json',
    /** Блюдо, которому принадлежит картинка */
    dish: {
        collection: 'dish',
        via: 'images'
    },
    /** */
    group: {
        collection: 'group',
        via: 'images'
    },
    /** Группа, которой принажлежит картинка */
    uploadDate: 'string'
};
let Model = {};
module.exports = {
    primaryKey: "id",
    attributes: attributes,
    ...Model
};
