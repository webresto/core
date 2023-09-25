"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    settings: {
        title: "Settings",
        model: "settings",
        icon: "cog",
        fields: {
            id: false,
            key: "Key",
            description: "Description",
            value: "Value",
            section: "Section",
            createdAt: false,
            updatedAt: false,
        },
        list: {
            fields: {
                id: false,
                value: false,
            },
        },
        add: {
            fields: {
                value: {
                    title: "Key",
                    type: "json",
                },
            },
        },
        edit: {
            fields: {
                description: {
                    title: "Описание",
                    type: "longtext",
                    disabled: true,
                },
                key: {
                    disabled: true,
                },
                value: {
                    title: "Description",
                    type: "json",
                },
            },
        },
    },
};
