"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
const hashCode_1 = require("../libs/hashCode");
let attributes = {
    /** ID */
    id: {
        type: "string",
        //required: true,
    },
    /** Id in external system */
    externalId: {
        type: "string"
    },
    /** Name of street */
    name: "string",
    /** dataHash */
    hash: "string",
    /** Street has delited */
    isDeleted: {
        type: 'boolean'
    },
    customData: "json",
};
let Model = {
    beforeCreate(streetInit, cb) {
        if (!streetInit.id) {
            streetInit.id = (0, uuid_1.v4)();
        }
        if (streetInit.isDeleted === undefined) {
            streetInit.isDeleted = false;
        }
        cb();
    },
    /**
   * Checks whether the street exists, if it does not exist, then creates a new one and returns it.If exists, then checks
   * Hesh of the existing street and new data, if they are identical, then immediately gives the streetes, if not, it updates its data
   * for new ones
   * @param values
   * @return Updated or created street
   */
    async createOrUpdate(values) {
        sails.log.silly(`Core > Street > createOrUpdate: ${values.name}`);
        let hash = (0, hashCode_1.default)(JSON.stringify(values));
        let criteria = {};
        if (values.id) {
            criteria['id'] = values.id;
        }
        else if (values.externalId) {
            criteria['externalId'] = values.externalId;
        }
        else {
            throw `street ID not found`;
        }
        const street = await Street.findOne(criteria);
        if (!street) {
            return Street.create({ hash, ...values }).fetch();
        }
        else {
            if (hash === street.hash) {
                return street;
            }
            return (await Street.update({ id: values.id }, { hash, ...values }).fetch())[0];
        }
    }
};
module.exports = {
    primaryKey: "id",
    attributes: attributes,
    ...Model,
};
