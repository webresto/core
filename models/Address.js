"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
const defaultGeo_1 = require("../adapters/geo/default/defaultGeo");
const compare_1 = require("../lib/address/compare");
const range_1 = require("../lib/address/range");
const coordinate_1 = require("../lib/address/coordinate");
const name_match_1 = require("../lib/address/name-match");
const association_id_1 = require("../lib/association-id");
/**
 * The address catalog of a city: one flat table, one row per node.
 *
 * A node knows its city and its parent, and nothing else about where it sits.
 * There is no `ancestors` column and no table of names or codes: the graph is
 * shallow, so the path is read by following `parent`, and every query the
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
    /**
     * One of `ADDRESS_TYPES` of the default geo adapter, which owns this model.
     * Checked by `assertNode`, not by `isIn`, so the list is stated once.
     */
    type: {
        type: "string",
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
    /** Only leaves carry one: `house`, `entrance`, `unit`, `place`, and a `range` for its middle. */
    point: {
        type: "json",
    },
    /**
     * The house numbers a `range` node stands for, and nobody else's business.
     *
     * A street of five hundred houses is not worth five hundred rows when the
     * whole block delivers the same: one node says "1 to 99", carries the point
     * of its middle, and the number the customer types stays in `home`.
     * `null` on either side is a range open at that end.
     */
    lo: {
        type: "number",
        allowNull: true,
    },
    hi: {
        type: "number",
        allowNull: true,
    },
    // Parity is the one thing that lets a street be a zone border — odd side in
    // one zone, even in the other; bring it back if that case shows up.
    // parity: {
    //   type: "string",
    //   isIn: ["any", "odd", "even"],
    //   defaultsTo: "any",
    // } as unknown as "any" | "odd" | "even",
    /** Id of the street in an RMS. Null for everything entered here or imported from a file. */
    externalId: {
        type: "string",
        allowNull: true,
    },
};
async function assertNode(values) {
    if (values.type !== undefined && !defaultGeo_1.ADDRESS_TYPES.includes(values.type)) {
        throw new Error(`Address type "${values.type}" is unknown`);
    }
    if (values.point !== undefined && values.point !== null && !(0, coordinate_1.isValidCoordinate)(values.point)) {
        throw new Error("Address point must contain a valid latitude and longitude");
    }
    // Bounds belong to a range and to nothing else. On any other type they would
    // be a second, silent answer to "which house is this" that no search reads.
    if (values.type && values.type !== "range") {
        if (typeof values.lo === "number" || typeof values.hi === "number") {
            throw new Error(`Address of type "${values.type}" cannot carry lo or hi: those make a range`);
        }
    }
    const parentId = (0, association_id_1.toId)(values.parent);
    if (parentId) {
        const parent = await Address.findOne({ id: parentId });
        if (!parent)
            throw new Error(`Address parent ${parentId} not found`);
        const city = (0, association_id_1.toId)(values.city);
        if (city && (0, association_id_1.toId)(parent.city) !== city) {
            throw new Error("Address parent belongs to another city");
        }
    }
    // Two identical names of one type under one parent are a data entry mistake:
    // the list would show the same word twice and the customer would take
    // whichever came first. Two "Ленина" in one city are fine — under two
    // different districts, which is exactly what tells them apart.
    const city = (0, association_id_1.toId)(values.city);
    if (city && values.type && values.name) {
        const twin = await Address.findOne({
            city,
            parent: parentId ?? null,
            type: values.type,
            name: values.name,
        });
        if (twin && twin.id !== values.id) {
            throw new Error(`Address "${values.name}" of type "${values.type}" already exists here`);
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
     * With no `parent` the search starts at the city, with one it sees that node's
     * children, whatever they are. Matching is done here rather than in the query
     * because `names` is a json array and because "лени" has to find "Ленина".
     *
     * At the root a node qualifies two ways. By type: a street under a ward is
     * still a street, and a customer who types "Trần Phú" must not have to know
     * which ward it is in first — depth deliberately is not a filter, that was a
     * per-city assumption about structure. Or by hanging off the city itself: a
     * camp site has no streets, its tents are direct children of the city, and
     * "42" has to find "Шатёр 42". House numbers stay out of both: a `house`
     * hangs under a street, so "10" still finds nothing in a town.
     *
     * A `range` never matches its own name — nobody types "1–99". It
     * matches the number in front of what was typed, and only after every node
     * that matched by name: a house that is really in the catalog is a better
     * answer than the block it belongs to.
     */
    async search(params) {
        const criteria = { city: params.city };
        if (params.parent) {
            criteria.parent = params.parent;
        }
        else {
            criteria.or = [{ type: defaultGeo_1.ROOT_SEARCHABLE }, { parent: null }];
        }
        const nodes = await Address.find(criteria);
        const needle = (params.query ?? "").trim().toLowerCase();
        const number = (0, range_1.leadingNumber)(needle);
        const named = nodes.filter((node) => node.type !== "range" && (!needle || (0, name_match_1.nameMatches)(node, needle)));
        const ranges = number === null ? [] : nodes.filter((node) => node.type === "range" && (0, range_1.rangeCovers)(node, number));
        const byName = (a, b) => (0, compare_1.compareAddressNames)(a.name, b.name);
        return [...named.sort(byName), ...ranges.sort(byName)].slice(0, defaultGeo_1.ADDRESS_SEARCH_LIMIT);
    },
    /** The nodes from the city down to `id`, in that order. What `formatted` is built from. */
    async path(id) {
        const chain = [];
        let current = id;
        // Not a depth limit: a graph is as deep as its data, and the list of types
        // says nothing about that. The bound is what stops a parent set to its own
        // descendant from spinning the server instead of returning junk.
        while (current && chain.length < 32) {
            const node = await Address.findOne({ id: current });
            if (!node)
                break;
            chain.unshift(node);
            current = (0, association_id_1.toId)(node.parent);
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
