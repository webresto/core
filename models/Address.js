"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
const address_1 = require("../lib/address");
const delivery_location_1 = require("../lib/delivery-location");
/**
 * The address catalog of a city: one flat table, one row per node.
 *
 * A node knows its city and its parent, and nothing else about where it sits.
 * There is no `ancestors` column and no table of names or codes: the graph is at
 * most four deep, so the path is read by following `parent`, and every query the
 * storefront makes is "the children of this node" or "the roots of this city".
 *
 * Houses are rows here too, with their own `point`. That is the whole reason the
 * catalog exists: an address chosen from it resolves to a coordinate without a
 * geocoder, which is what makes a delivery calculation repeatable.
 */
let attributes = {
    /** ID */
    id: {
        type: "string",
    },
    /** Which city's catalog this node belongs to. On every node, so a search never walks up. */
    city: {
        model: "city",
        required: true,
    },
    /** The node above. Null means a direct child of the city. */
    parent: {
        model: "address",
    },
    type: {
        type: "string",
        isIn: [...address_1.ADDRESS_TYPES],
        required: true,
    },
    /** "Ленина", "12", "гост. Прибалтийская". */
    name: {
        type: "string",
        required: true,
    },
    /** Aliases, former names, transliterations. Searched together with `name`. */
    names: {
        type: "json",
        defaultsTo: [],
    },
    /** Only leaves carry one: `house`, `entrance`, `place`. */
    point: {
        type: "json",
    },
    /** Id of the street in an RMS. Null for everything entered here or imported from a file. */
    externalId: {
        type: "string",
        allowNull: true,
    },
    enable: {
        type: "boolean",
        defaultsTo: true,
    },
};
function idOf(value) {
    if (typeof value === "string")
        return value;
    if (value && typeof value === "object")
        return value.id;
    return undefined;
}
function matches(node, needle) {
    if (node.name?.toLowerCase().includes(needle))
        return true;
    return (node.names ?? []).some((alias) => typeof alias === "string" && alias.toLowerCase().includes(needle));
}
async function assertNode(values) {
    if (values.point !== undefined && values.point !== null && !(0, delivery_location_1.isValidCoordinate)(values.point)) {
        throw new Error("Address point must contain a valid latitude and longitude");
    }
    const parentId = idOf(values.parent);
    if (values.type && address_1.CHILD_ONLY.includes(values.type) && !parentId) {
        throw new Error(`Address of type "${values.type}" is only ever a child: parent is required`);
    }
    if (parentId) {
        const parent = await Address.findOne({ id: parentId });
        if (!parent)
            throw new Error(`Address parent ${parentId} not found`);
        const city = idOf(values.city);
        if (city && idOf(parent.city) !== city) {
            throw new Error("Address parent belongs to another city");
        }
    }
}
let Model = {
    async beforeCreate(init, cb) {
        try {
            if (!init.id)
                init.id = (0, uuid_1.v4)();
            await assertNode(init);
            cb();
        }
        catch (error) {
            cb(error instanceof Error ? error.message : String(error));
        }
    },
    async beforeUpdate(values, cb) {
        try {
            await assertNode(values);
            cb();
        }
        catch (error) {
            cb(error instanceof Error ? error.message : String(error));
        }
    },
    /**
     * What to offer for what the customer has typed.
     *
     * With no `parent` the search starts at the city and sees only the types that
     * make sense on their own; with one it sees that node's children, whatever
     * they are. Matching is done here rather than in the query because `names` is
     * a json array and because "лени" has to find "Ленина".
     *
     * The type is the whole filter at the root — depth deliberately is not. A
     * street under a ward is still a street, and a customer who types "Trần Phú"
     * must not have to know which ward it is in first. Requiring `parent: null`
     * there was a per-city assumption about structure, which is the one thing this
     * model set out not to have. House numbers stay out either way: `house` is not
     * a root type, so "10" with nothing chosen still finds nothing.
     */
    async search(params) {
        const criteria = { city: params.city, enable: true };
        if (params.parent) {
            criteria.parent = params.parent;
        }
        else {
            criteria.type = address_1.ROOT_SEARCHABLE;
        }
        const nodes = await Address.find(criteria).sort("name ASC");
        const needle = (params.query ?? "").trim().toLowerCase();
        const found = needle ? nodes.filter((node) => matches(node, needle)) : nodes;
        return found.slice(0, address_1.ADDRESS_SEARCH_LIMIT);
    },
    /** The nodes from the city down to `id`, in that order. What `formatted` is built from. */
    async path(id) {
        const chain = [];
        let current = id;
        // The graph is at most four deep; the bound is what stops a parent set to
        // its own descendant from spinning the server instead of returning junk.
        while (current && chain.length < address_1.ADDRESS_TYPES.length) {
            const node = await Address.findOne({ id: current });
            if (!node)
                break;
            chain.unshift(node);
            current = idOf(node.parent);
        }
        return chain;
    },
    /**
     * The one way an RMS writes a street into the catalog.
     *
     * Streets are the only thing an RMS knows about addresses, and it knows them
     * by `externalId`; houses come from a file or from an operator.
     */
    async upsertStreet(values) {
        const existing = await Address.findOne({ city: values.city, type: "street", externalId: values.externalId });
        if (!existing) {
            return await Address.create({
                city: values.city,
                parent: null,
                type: "street",
                name: values.name,
                externalId: values.externalId,
            }).fetch();
        }
        if (existing.name === values.name)
            return existing;
        return (await Address.update({ id: existing.id }, { name: values.name }).fetch())[0];
    },
};
module.exports = {
    primaryKey: "id",
    attributes: attributes,
    ...Model,
};
