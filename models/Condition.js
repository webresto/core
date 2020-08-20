"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const causes_1 = require("../lib/causes");
const actions_1 = require("../lib/actions");
module.exports = {
    attributes: {
        name: 'string',
        description: 'string',
        enable: {
            type: 'boolean',
            defaultsTo: true
        },
        weight: {
            type: 'integer',
            defaultsTo: 0
        },
        causes: 'json',
        actions: 'json',
        zones: {
            collection: 'zone'
        },
        needy: {
            type: 'boolean',
            defaultsTo: false
        },
        check: async function (cart) {
            return await causes_1.default(this, cart);
        },
        exec: async function (cart) {
            let result = cart;
            await Promise.each(Object.entries(this.actions), async ([action, params]) => {
                if (typeof params === 'boolean') {
                    params = {};
                }
                params.cartId = cart.id;
                result = await Condition.action(action, params);
            });
            return result;
        },
        hasReturn: function () {
            return this.actions.return || this.actions.reject;
        }
    },
    action: async function (actionName, params) {
        const action = actions_1.default[actionName];
        if (!action) {
            throw 'action not found';
        }
        return await action(params);
    },
    async checkConditionsExists() {
        let conditions = await Condition.find();
        return conditions.length > 0;
    },
    async getConditions(street, home) {
        let conditions = await Condition.find().populate('zones');
        const needy = conditions.filter(c => c.needy);
        const zones = await Zone.count();
        if (!zones) {
            return needy;
        }
        const zone = await Zone.getDeliveryCoast(street, home);
        if (!zone) {
            throw {
                code: 404,
                message: "zone not found"
            };
        }
        conditions = conditions.filter(c => !c.zones || c.zones.filter(z => z.id === zone.id).length);
        conditions = conditions.concat(needy);
        conditions.sort((a, b) => b.weight - a.weight);
        return conditions;
    }
};
