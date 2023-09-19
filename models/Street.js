"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const uuid_1 = require("uuid");
const hashCode_1 = __importDefault(require("../libs/hashCode"));
const CustomData_1 = require("../interfaces/CustomData");
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
    /** Street has delited */
    enable: {
        type: 'boolean',
        allowNull: true
    },
    city: {
        model: 'city'
    },
    customData: "json",
};
/**
 * Pelase emit core:streets:updated after finish update streets
 */
let Model = {
    async beforeUpdate(value, cb) {
        if (value.customData) {
            if (value.id !== undefined) {
                let current = await Street.findOne({ id: value.id });
                if (!(0, CustomData_1.isCustomData)(current.customData))
                    current.customData = {};
                let customData = { ...current.customData, ...value.customData };
                value.customData = customData;
            }
        }
        cb();
    },
    beforeCreate(streetInit, cb) {
        if (!streetInit.id) {
            streetInit.id = (0, uuid_1.v4)();
        }
        if (streetInit.isDeleted === undefined || streetInit.isDeleted === null) {
            streetInit.isDeleted = false;
        }
        if (streetInit.enable === undefined || streetInit.enable === null) {
            streetInit.enable = true;
        }
        if (!(0, CustomData_1.isCustomData)(streetInit.customData)) {
            streetInit.customData = {};
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
