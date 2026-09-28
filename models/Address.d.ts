import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";
import { CityRecord } from "./City";
import { AddressPoint } from "../interfaces/Geo";
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
declare let attributes: {
    /** ID */
    id: string;
    /** Which city's catalog this node belongs to. On every node, so a search never walks up. */
    city: CityRecord | string;
    /** The node above. Null means a direct child of the city. */
    parent: AddressRecord | string | null;
    /**
     * One of `ADDRESS_TYPES` of the default geo adapter, which owns this model.
     * Checked by `assertNode`, not by `isIn`, so the list is stated once.
     */
    type: string;
    /** "Ленина", "12", "гост. Прибалтийская". */
    name: string;
    /** Aliases, former names, transliterations. Searched together with `name`. */
    names: string[];
    /** Only leaves carry one: `house`, `entrance`, `unit`, `place`, and a `range` for its middle. */
    point: AddressPoint | null;
    /**
     * The house numbers a `range` node stands for, and nobody else's business.
     *
     * A street of five hundred houses is not worth five hundred rows when the
     * whole block delivers the same: one node says "1 to 99", carries the point
     * of its middle, and the number the customer types stays in `home`.
     * `null` on either side is a range open at that end.
     */
    lo: number | null;
    hi: number | null;
    /** Id of the street in an RMS. Null for everything entered here or imported from a file. */
    externalId: string | null;
};
type attributes = typeof attributes;
export interface AddressRecord extends attributes, ORM {
}
declare let Model: {
    beforeCreate(init: AddressRecord, cb: (err?: string) => void): Promise<void>;
    beforeUpdate(values: Partial<AddressRecord>, cb: (err?: string) => void): Promise<void>;
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
    search(params: {
        city: string;
        parent?: string | null;
        query: string;
    }): Promise<AddressRecord[]>;
    /** The nodes from the city down to `id`, in that order. What `formatted` is built from. */
    path(id: string): Promise<AddressRecord[]>;
    /**
     * The one way an RMS writes a street into the catalog.
     *
     * Streets are the only thing an RMS knows about addresses, and it knows them
     * by `externalId`; houses come from a file or from an operator.
     */
    upsertStreet(values: {
        city: string;
        externalId: string;
        name: string;
    }): Promise<AddressRecord>;
};
declare global {
    const Address: typeof Model & ORMModel<AddressRecord, never>;
}
export {};
