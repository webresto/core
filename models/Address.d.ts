import ORM from "../interfaces/ORM";
import { ORMModel } from "../interfaces/ORMModel";
import { CityRecord } from "./City";
import { AddressPoint, AddressType } from "../lib/address";
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
declare let attributes: {
    /** ID */
    id: string;
    /** Which city's catalog this node belongs to. On every node, so a search never walks up. */
    city: CityRecord | string;
    /** The node above. Null means a direct child of the city. */
    parent: AddressRecord | string | null;
    type: AddressType;
    /** "Ленина", "12", "гост. Прибалтийская". */
    name: string;
    /** Aliases, former names, transliterations. Searched together with `name`. */
    names: string[];
    /** Only leaves carry one: `house`, `entrance`, `place`. */
    point: AddressPoint | null;
    /** Id of the street in an RMS. Null for everything entered here or imported from a file. */
    externalId: string | null;
    enable: boolean;
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
     * With no `parent` the search starts at the city and sees only the types that
     * make sense on their own; with one it sees that node's children, whatever
     * they are. Matching is done here rather than in the query because `names` is
     * a json array and because "лени" has to find "Ленина".
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
