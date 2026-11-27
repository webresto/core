"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
const user_location_1 = require("../lib/user-location");
/** One attribute per field of `OrderAddress`, so the two shapes cannot drift apart. */
const addressAttributes = {
    formatted: {
        type: "string",
        required: true,
    },
    city: {
        type: "string",
        allowNull: true,
    },
    home: {
        type: "string",
        allowNull: true,
    },
    housing: {
        type: "string",
        allowNull: true,
    },
    apartment: {
        type: "string",
        allowNull: true,
    },
    entrance: {
        type: "string",
        allowNull: true,
    },
    floor: {
        type: "string",
        allowNull: true,
    },
    doorphone: {
        type: "string",
        allowNull: true,
    },
    comment: {
        type: "string",
        allowNull: true,
    },
    coordinate: {
        type: "json",
    },
};
let attributes = {
    /** ID */
    id: {
        type: "string",
        //required: true,
    },
    /** What the storefront lists. `formatted` unless given. */
    name: {
        type: "string",
        allowNull: true,
    },
    ...addressAttributes,
    /**
     * Set as default for specific user
     * */
    isDefault: {
        type: 'boolean',
    },
    user: {
        model: 'user',
        required: true
    },
    customData: "json",
};
let Model = {
    async beforeCreate(init, cb) {
        if (!init.id) {
            init.id = (0, uuid_1.v4)();
        }
        if (!init.name) {
            init.name = init.formatted;
        }
        if (init.isDefault === true) {
            await UserLocation.update({ user: init.user }, { isDefault: false });
        }
        cb();
    },
    /**
     * Makes one of the user's locations the default and unsets the rest of theirs.
     *
     * Scoped by the owner in both writes: an id of someone else's location finds
     * nothing and changes nothing, and is refused like an id that does not exist.
     */
    async setDefault(user, id) {
        const [location] = await UserLocation.update({ id, user }, { isDefault: true }).fetch();
        if (!location)
            throw `User location not found`;
        await UserLocation.update({ user, id: { "!=": id } }, { isDefault: false });
        return location;
    },
    /**
     * Keeps an address of the customer, once per line: the address of a placed
     * delivery, or one they add in their profile (`locationCreate`). A line the
     * user already has is left as it is — with its name and whether it is the
     * default. True when the address is new to them.
     */
    async remember(user, address) {
        if (!address.formatted)
            return false;
        const formatted = (0, user_location_1.wholeLine)(address.formatted, address.home);
        if (await UserLocation.findOne({ user, formatted }))
            return false;
        const given = address;
        const tail = Object.keys(addressAttributes)
            .filter((key) => given[key] !== undefined && given[key] !== null)
            .map((key) => [key, given[key]]);
        await UserLocation.create({ ...Object.fromEntries(tail), formatted, user }).fetch();
        return true;
    },
};
module.exports = {
    primaryKey: "id",
    attributes: attributes,
    ...Model,
};
