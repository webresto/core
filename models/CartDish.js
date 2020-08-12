"use strict";
exports.__esModule = true;
module.exports = {
    attributes: {
        id: {
            type: 'integer',
            autoIncrement: true,
            primaryKey: true
        },
        amount: 'integer',
        dish: {
            model: 'Dish'
        },
        modifiers: 'json',
        cart: {
            model: 'Cart',
            via: 'dishes'
        },
        parent: {
            model: 'CartDish',
            via: 'modifiers'
        },
        uniqueItems: 'integer',
        itemTotal: 'float',
        comment: 'string',
        addedBy: {
            type: 'string',
            defaultsTo: 'user'
        },
        weight: 'float',
        totalWeight: 'float'
    }
};
