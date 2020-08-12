"use strict";
exports.__esModule = true;
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
        },
        startDate: 'date',
        stopDate: 'date'
    }
};
