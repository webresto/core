"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
module.exports = {
    attributes: {
        id: {
            type: 'string',
            primaryKey: true,
            autoIncrement: true
        },
        title: 'string',
        description: 'string',
        enable: {
            type: 'boolean',
            defaultsTo: true
        }
    }
};
