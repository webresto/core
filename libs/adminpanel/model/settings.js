"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = {
    user: {
        title: "User",
        model: "user",
        icon: "user"
    },
    products: {
        model: 'dish',
        title: 'Products',
        icon: 'hamburger'
    },
    groups: {
        model: 'group',
        title: 'Groups',
        icon: 'folder'
    },
    orders: {
        model: 'order',
        title: 'Orders',
        icon: 'shopping-cart'
    },
    bonusprogram: {
        model: 'bonusprogram',
        title: 'Bonus programs',
        icon: 'comments-dollar'
    },
    userbonusprogram: {
        model: 'userbonusprogram',
        title: 'User bonusprograms',
        icon: 'money-bill-wave-alt'
    },
    userbonustransaction: {
        model: 'userbonustransaction',
        title: 'Userbonus transactions',
        icon: 'exchange-alt'
    },
    promotions: {
        model: 'promotion',
        title: 'Promotions',
        icon: 'gift'
    },
    promotioncode: {
        model: 'promotioncode',
        title: 'Promotion codes',
        icon: 'qrcode'
    },
    place: {
        model: 'place',
        title: 'Places',
        icon: 'store'
    },
    settings: {
        title: "Settings",
        model: "settings",
        icon: "cog",
        fields: {
            id: false,
            key: "Key",
            name: "Name",
            description: "Description",
            tooltip: "Tooltip",
            value: "Value",
            defaultValue: "Default value",
            type: "Type",
            jsonSchema: "JSON Schema",
            readOnly: "Read only",
            uiSchema: "UI Schema",
            module: "Module",
            createdAt: false,
            updatedAt: false,
            isRequired: "Is required"
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
                    title: "Value",
                    type: "json",
                },
            },
        },
    },
};
