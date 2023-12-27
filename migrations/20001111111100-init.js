'use strict';
// sql template autogenerated by gen-db-migrates

var async = require('async')
var dbm;
var type;
var seed;

/**
* We receive the dbmigrate dependency from dbmigrate initially.
* This enables us to not have to rely on NODE_PATH.
*/
exports.setup = function(options, seedLink) {
  dbm = options.dbmigrate;
  type = dbm.dataType;
  seed = seedLink;
};

exports.up = function (db, callback) {
  async.series([
    (cb) => db.createTable('bonusprogram', {
    columns: {
    "id": {
        "type": "text",
        "primaryKey": true
    },
    "externalId": {
        "type": "text"
    },
    "name": {
        "type": "text"
    },
    "adapter": {
        "type": "text",
        "unique": true
    },
    "exchangeRate": {
        "type": "real"
    },
    "coveragePercentage": {
        "type": "real"
    },
    "decimals": {
        "type": "real"
    },
    "sortOrder": {
        "type": "real"
    },
    "description": {
        "type": "text"
    },
    "iconLink": {
        "type": "text"
    },
    "detailInfoLink": {
        "type": "text"
    },
    "enable": {
        "type": "boolean"
    },
    "automaticUserRegistration": {
        "type": "boolean"
    },
    "customData": {
        "type": "json"
    },
    "createdAt": {
        "type": "bigint"
    },
    "updatedAt": {
        "type": "bigint"
    }
},
    ifNotExists: true
  }, cb),
(cb) => db.createTable('city', {
    columns: {
    "id": {
        "type": "text",
        "primaryKey": true
    },
    "externalId": {
        "type": "text"
    },
    "name": {
        "type": "text"
    },
    "isDeleted": {
        "type": "boolean"
    },
    "customData": {
        "type": "json"
    },
    "createdAt": {
        "type": "bigint"
    },
    "updatedAt": {
        "type": "bigint"
    }
},
    ifNotExists: true
  }, cb),
(cb) => db.createTable('dish', {
    columns: {
    "id": {
        "type": "text",
        "primaryKey": true
    },
    "rmsId": {
        "type": "text"
    },
    "additionalInfo": {
        "type": "text",
        "notNull": false
    },
    "code": {
        "type": "text",
        "notNull": false
    },
    "description": {
        "type": "text",
        "notNull": false
    },
    "ingredients": {
        "type": "text",
        "notNull": false
    },
    "name": {
        "type": "text"
    },
    "seoDescription": {
        "type": "text",
        "notNull": false
    },
    "seoKeywords": {
        "type": "text",
        "notNull": false
    },
    "seoText": {
        "type": "text",
        "notNull": false
    },
    "seoTitle": {
        "type": "text",
        "notNull": false
    },
    "carbohydrateAmount": {
        "type": "real"
    },
    "carbohydrateFullAmount": {
        "type": "real",
        "notNull": false
    },
    "energyAmount": {
        "type": "real",
        "notNull": false
    },
    "energyFullAmount": {
        "type": "real",
        "notNull": false
    },
    "fatAmount": {
        "type": "real",
        "notNull": false
    },
    "fatFullAmount": {
        "type": "real",
        "notNull": false
    },
    "fiberAmount": {
        "type": "real",
        "notNull": false
    },
    "fiberFullAmount": {
        "type": "real",
        "notNull": false
    },
    "groupId": {
        "type": "text",
        "notNull": false
    },
    "measureUnit": {
        "type": "text",
        "notNull": false
    },
    "price": {
        "type": "real"
    },
    "productCategoryId": {
        "type": "text",
        "notNull": false
    },
    "type": {
        "type": "text"
    },
    "weight": {
        "type": "real",
        "notNull": false
    },
    "sortOrder": {
        "type": "real"
    },
    "isDeleted": {
        "type": "boolean"
    },
    "isModificable": {
        "type": "boolean"
    },
    "modifiers": {
        "type": "json"
    },
    "parentGroup": {
        "type": "text"
    },
    "tags": {
        "type": "json"
    },
    "balance": {
        "type": "real",
        "defaultValue": -1
    },
    "slug": {
        "type": "text"
    },
    "concept": {
        "type": "text"
    },
    "hash": {
        "type": "text"
    },
    "visible": {
        "type": "boolean"
    },
    "modifier": {
        "type": "boolean"
    },
    "promo": {
        "type": "boolean"
    },
    "worktime": {
        "type": "json"
    },
    "customData": {
        "type": "json"
    },
    "createdAt": {
        "type": "bigint"
    },
    "updatedAt": {
        "type": "bigint"
    }
},
    ifNotExists: true
  }, cb),
(cb) => db.createTable('group', {
    columns: {
    "id": {
        "type": "text",
        "primaryKey": true
    },
    "rmsId": {
        "type": "text"
    },
    "additionalInfo": {
        "type": "text",
        "notNull": false
    },
    "code": {
        "type": "text",
        "notNull": false
    },
    "description": {
        "type": "text",
        "notNull": false
    },
    "isDeleted": {
        "type": "boolean"
    },
    "name": {
        "type": "text"
    },
    "seoDescription": {
        "type": "text",
        "notNull": false
    },
    "seoKeywords": {
        "type": "text",
        "notNull": false
    },
    "seoText": {
        "type": "text",
        "notNull": false
    },
    "seoTitle": {
        "type": "text",
        "notNull": false
    },
    "sortOrder": {
        "type": "real"
    },
    "parentGroup": {
        "type": "text"
    },
    "icon": {
        "type": "text",
        "notNull": false
    },
    "dishesPlaceholder": {
        "type": "text"
    },
    "slug": {
        "type": "text"
    },
    "concept": {
        "type": "text"
    },
    "visible": {
        "type": "boolean"
    },
    "modifier": {
        "type": "boolean"
    },
    "promo": {
        "type": "boolean"
    },
    "worktime": {
        "type": "json"
    },
    "customData": {
        "type": "json"
    },
    "createdAt": {
        "type": "bigint"
    },
    "updatedAt": {
        "type": "bigint"
    }
},
    ifNotExists: true
  }, cb),
(cb) => db.createTable('maintenance', {
    columns: {
    "id": {
        "type": "text",
        "primaryKey": true
    },
    "title": {
        "type": "text"
    },
    "description": {
        "type": "text"
    },
    "enable": {
        "type": "boolean",
        "defaultValue": true
    },
    "worktime": {
        "type": "json"
    },
    "startDate": {
        "type": "text"
    },
    "stopDate": {
        "type": "text"
    },
    "createdAt": {
        "type": "bigint"
    },
    "updatedAt": {
        "type": "bigint"
    }
},
    ifNotExists: true
  }, cb),
(cb) => db.createTable('mediafile', {
    columns: {
    "id": {
        "type": "text",
        "primaryKey": true
    },
    "images": {
        "type": "json"
    },
    "original": {
        "type": "text"
    },
    "sortOrder": {
        "type": "real"
    },
    "uploadDate": {
        "type": "text"
    },
    "createdAt": {
        "type": "bigint"
    },
    "updatedAt": {
        "type": "bigint"
    }
},
    ifNotExists: true
  }, cb),
(cb) => db.createTable('onetimepassword', {
    columns: {
    "id": {
        "type": "int",
        "autoIncrement": true,
        "primaryKey": true
    },
    "login": {
        "type": "text"
    },
    "password": {
        "type": "text"
    },
    "expires": {
        "type": "real"
    },
    "createdAt": {
        "type": "bigint"
    },
    "updatedAt": {
        "type": "bigint"
    }
},
    ifNotExists: true
  }, cb),
(cb) => db.createTable('order', {
    columns: {
    "id": {
        "type": "text",
        "primaryKey": true
    },
    "shortId": {
        "type": "text"
    },
    "state": {
        "type": "text"
    },
    "concept": {
        "type": "text"
    },
    "isMixedConcept": {
        "type": "boolean"
    },
    "paymentMethod": {
        "type": "text"
    },
    "paymentMethodTitle": {
        "type": "text"
    },
    "paid": {
        "type": "boolean",
        "defaultValue": false
    },
    "isPaymentPromise": {
        "type": "boolean",
        "defaultValue": true
    },
    "promotionState": {
        "type": "json"
    },
    "promotionCode": {
        "type": "text"
    },
    "promotionCodeString": {
        "type": "text",
        "notNull": false
    },
    "promotionFlatDiscount": {
        "type": "real",
        "defaultValue": 0
    },
    "promotionCodeCheckValidTill": {
        "type": "text",
        "notNull": false
    },
    "isPromoting": {
        "type": "boolean"
    },
    "dishesCount": {
        "type": "real"
    },
    "uniqueDishes": {
        "type": "real"
    },
    "modifiers": {
        "type": "json"
    },
    "customer": {
        "type": "json"
    },
    "address": {
        "type": "json"
    },
    "comment": {
        "type": "text"
    },
    "personsCount": {
        "type": "text"
    },
    "date": {
        "type": "text",
        "notNull": false
    },
    "problem": {
        "type": "boolean",
        "defaultValue": false
    },
    "rmsDelivered": {
        "type": "boolean",
        "defaultValue": false
    },
    "rmsId": {
        "type": "text"
    },
    "rmsOrderNumber": {
        "type": "text"
    },
    "rmsOrderData": {
        "type": "json"
    },
    "rmsDeliveryDate": {
        "type": "text"
    },
    "rmsErrorMessage": {
        "type": "text"
    },
    "rmsErrorCode": {
        "type": "text"
    },
    "rmsStatusCode": {
        "type": "text"
    },
    "deliveryStatus": {
        "type": "text"
    },
    "pickupPoint": {
        "type": "text"
    },
    "selfService": {
        "type": "boolean",
        "defaultValue": false
    },
    "delivery": {
        "type": "json"
    },
    "deliveryDescription": {
        "type": "text",
        "notNull": false
    },
    "message": {
        "type": "text"
    },
    "deliveryItem": {
        "type": "text"
    },
    "deliveryCost": {
        "type": "real",
        "defaultValue": 0
    },
    "totalWeight": {
        "type": "real",
        "defaultValue": 0
    },
    "trifleFrom": {
        "type": "real",
        "defaultValue": 0
    },
    "bonusesTotal": {
        "type": "real",
        "defaultValue": 0
    },
    "spendBonus": {
        "type": "json"
    },
    "total": {
        "type": "real",
        "defaultValue": 0
    },
    "basketTotal": {
        "type": "real",
        "defaultValue": 0
    },
    "orderTotal": {
        "type": "real",
        "defaultValue": 0
    },
    "discountTotal": {
        "type": "real",
        "defaultValue": 0
    },
    "orderDate": {
        "type": "text"
    },
    "deviceId": {
        "type": "text"
    },
    "user": {
        "type": "text"
    },
    "customData": {
        "type": "json"
    },
    "createdAt": {
        "type": "bigint"
    },
    "updatedAt": {
        "type": "bigint"
    }
},
    ifNotExists: true
  }, cb),
(cb) => db.createTable('orderdish', {
    columns: {
    "id": {
        "type": "int",
        "autoIncrement": true,
        "primaryKey": true
    },
    "amount": {
        "type": "real"
    },
    "dish": {
        "type": "text"
    },
    "modifiers": {
        "type": "json"
    },
    "order": {
        "type": "text"
    },
    "uniqueItems": {
        "type": "real"
    },
    "itemTotal": {
        "type": "real"
    },
    "itemTotalBeforeDiscount": {
        "type": "real"
    },
    "discountTotal": {
        "type": "real"
    },
    "discountType": {
        "type": "text"
    },
    "discountAmount": {
        "type": "real"
    },
    "discountMessage": {
        "type": "text"
    },
    "comment": {
        "type": "text"
    },
    "addedBy": {
        "type": "text",
        "defaultValue": "user"
    },
    "weight": {
        "type": "real"
    },
    "totalWeight": {
        "type": "real"
    },
    "createdAt": {
        "type": "bigint"
    },
    "updatedAt": {
        "type": "bigint"
    }
},
    ifNotExists: true
  }, cb),
(cb) => db.createTable('paymentdocument', {
    columns: {
    "id": {
        "type": "text",
        "primaryKey": true
    },
    "originModelId": {
        "type": "text"
    },
    "externalId": {
        "type": "text",
        "unique": true
    },
    "originModel": {
        "type": "text"
    },
    "paymentMethod": {
        "type": "text"
    },
    "amount": {
        "type": "real"
    },
    "paid": {
        "type": "boolean",
        "defaultValue": false
    },
    "status": {
        "type": "text",
        "defaultValue": "NEW"
    },
    "comment": {
        "type": "text"
    },
    "redirectLink": {
        "type": "text"
    },
    "error": {
        "type": "text"
    },
    "data": {
        "type": "json"
    },
    "createdAt": {
        "type": "bigint"
    },
    "updatedAt": {
        "type": "bigint"
    }
},
    ifNotExists: true
  }, cb),
(cb) => db.createTable('paymentmethod', {
    columns: {
    "id": {
        "type": "text",
        "primaryKey": true
    },
    "externalId": {
        "type": "text",
        "notNull": false
    },
    "title": {
        "type": "text"
    },
    "type": {
        "type": "text"
    },
    "isCash": {
        "type": "boolean"
    },
    "adapter": {
        "type": "text",
        "unique": true
    },
    "sortOrder": {
        "type": "real"
    },
    "description": {
        "type": "text"
    },
    "enable": {
        "type": "boolean"
    },
    "customData": {
        "type": "json"
    },
    "createdAt": {
        "type": "bigint"
    },
    "updatedAt": {
        "type": "bigint"
    }
},
    ifNotExists: true
  }, cb),
(cb) => db.createTable('place', {
    columns: {
    "id": {
        "type": "text",
        "primaryKey": true
    },
    "title": {
        "type": "text"
    },
    "address": {
        "type": "text"
    },
    "order": {
        "type": "real"
    },
    "phone": {
        "type": "text"
    },
    "enable": {
        "type": "boolean"
    },
    "worktime": {
        "type": "json"
    },
    "isPickupPoint": {
        "type": "boolean"
    },
    "isCookingPoint": {
        "type": "boolean"
    },
    "isSalePoint": {
        "type": "boolean"
    },
    "customData": {
        "type": "json"
    },
    "createdAt": {
        "type": "bigint"
    },
    "updatedAt": {
        "type": "bigint"
    }
},
    ifNotExists: true
  }, cb),
(cb) => db.createTable('promotion', {
    columns: {
    "id": {
        "type": "text",
        "unique": true,
        "primaryKey": true
    },
    "externalId": {
        "type": "text",
        "unique": true,
        "notNull": true
    },
    "configDiscount": {
        "type": "json"
    },
    "createdByUser": {
        "type": "boolean"
    },
    "name": {
        "type": "text"
    },
    "badge": {
        "type": "text"
    },
    "concept": {
        "type": "json"
    },
    "sortOrder": {
        "type": "real"
    },
    "description": {
        "type": "text"
    },
    "isPublic": {
        "type": "boolean"
    },
    "isJoint": {
        "type": "boolean"
    },
    "productCategoryPromotions": {
        "type": "json"
    },
    "enable": {
        "type": "boolean"
    },
    "isDeleted": {
        "type": "boolean"
    },
    "hash": {
        "type": "text"
    },
    "worktime": {
        "type": "json"
    },
    "createdAt": {
        "type": "bigint"
    },
    "updatedAt": {
        "type": "bigint"
    }
},
    ifNotExists: true
  }, cb),
(cb) => db.createTable('promotioncode', {
    columns: {
    "id": {
        "type": "text",
        "primaryKey": true
    },
    "externalId": {
        "type": "text",
        "notNull": false
    },
    "type": {
        "type": "text"
    },
    "prefix": {
        "type": "text",
        "notNull": false
    },
    "startDate": {
        "type": "text"
    },
    "stopDate": {
        "type": "text"
    },
    "workTime": {
        "type": "json"
    },
    "code": {
        "type": "text",
        "notNull": false
    },
    "generateConfig": {
        "type": "json"
    },
    "customData": {
        "type": "json"
    },
    "createdAt": {
        "type": "bigint"
    },
    "updatedAt": {
        "type": "bigint"
    }
},
    ifNotExists: true
  }, cb),
(cb) => db.createTable('settings', {
    columns: {
    "id": {
        "type": "int",
        "autoIncrement": true,
        "primaryKey": true
    },
    "key": {
        "type": "text",
        "unique": true
    },
    "description": {
        "type": "text"
    },
    "value": {
        "type": "json"
    },
    "section": {
        "type": "text"
    },
    "from": {
        "type": "text"
    },
    "readOnly": {
        "type": "boolean"
    },
    "schema": {
        "type": "json"
    },
    "createdAt": {
        "type": "bigint"
    },
    "updatedAt": {
        "type": "bigint"
    }
},
    ifNotExists: true
  }, cb),
(cb) => db.createTable('street', {
    columns: {
    "id": {
        "type": "text",
        "primaryKey": true
    },
    "externalId": {
        "type": "text",
        "notNull": false
    },
    "name": {
        "type": "text"
    },
    "hash": {
        "type": "text"
    },
    "isDeleted": {
        "type": "boolean"
    },
    "enable": {
        "type": "boolean",
        "notNull": false
    },
    "city": {
        "type": "text"
    },
    "customData": {
        "type": "json"
    },
    "createdAt": {
        "type": "bigint"
    },
    "updatedAt": {
        "type": "bigint"
    }
},
    ifNotExists: true
  }, cb),
(cb) => db.createTable('user', {
    columns: {
    "id": {
        "type": "text",
        "unique": true,
        "primaryKey": true
    },
    "login": {
        "type": "text"
    },
    "firstName": {
        "type": "text",
        "notNull": false
    },
    "lastName": {
        "type": "text",
        "notNull": false
    },
    "sex": {
        "type": "real",
        "notNull": false
    },
    "email": {
        "type": "text"
    },
    "phone": {
        "type": "json"
    },
    "birthday": {
        "type": "text"
    },
    "verified": {
        "type": "boolean"
    },
    "allRequiredCustomFieldsAreFilled": {
        "type": "boolean"
    },
    "passwordHash": {
        "type": "text",
        "notNull": false
    },
    "lastPasswordChange": {
        "type": "real"
    },
    "temporaryCode": {
        "type": "text",
        "notNull": false
    },
    "orderCount": {
        "type": "real"
    },
    "isDeleted": {
        "type": "boolean"
    },
    "customFields": {
        "type": "json"
    },
    "customData": {
        "type": "json"
    },
    "createdAt": {
        "type": "bigint"
    },
    "updatedAt": {
        "type": "bigint"
    }
},
    ifNotExists: true
  }, cb),
(cb) => db.createTable('userbonusprogram', {
    columns: {
    "id": {
        "type": "text",
        "primaryKey": true
    },
    "externalId": {
        "type": "text"
    },
    "externalCustomerId": {
        "type": "text"
    },
    "balance": {
        "type": "real"
    },
    "isDeleted": {
        "type": "boolean"
    },
    "isActive": {
        "type": "boolean"
    },
    "user": {
        "type": "text"
    },
    "bonusProgram": {
        "type": "text"
    },
    "syncedToTime": {
        "type": "text"
    },
    "customData": {
        "type": "json"
    },
    "createdAt": {
        "type": "bigint"
    },
    "updatedAt": {
        "type": "bigint"
    }
},
    ifNotExists: true
  }, cb),
(cb) => db.createTable('userbonustransaction', {
    columns: {
    "id": {
        "type": "text",
        "primaryKey": true
    },
    "externalId": {
        "type": "text",
        "notNull": false
    },
    "isNegative": {
        "type": "boolean"
    },
    "group": {
        "type": "text"
    },
    "comment": {
        "type": "text"
    },
    "amount": {
        "type": "real"
    },
    "balanceAfter": {
        "type": "real"
    },
    "isDeleted": {
        "type": "boolean"
    },
    "isStable": {
        "type": "boolean"
    },
    "time": {
        "type": "text"
    },
    "bonusProgram": {
        "type": "text"
    },
    "user": {
        "type": "text"
    },
    "customData": {
        "type": "json"
    },
    "createdAt": {
        "type": "bigint"
    },
    "updatedAt": {
        "type": "bigint"
    }
},
    ifNotExists: true
  }, cb),
(cb) => db.createTable('userdevice', {
    columns: {
    "id": {
        "type": "text",
        "primaryKey": true
    },
    "name": {
        "type": "text"
    },
    "userAgent": {
        "type": "text"
    },
    "isLogined": {
        "type": "boolean"
    },
    "user": {
        "type": "text"
    },
    "lastIP": {
        "type": "text"
    },
    "loginTime": {
        "type": "real"
    },
    "lastActivity": {
        "type": "real"
    },
    "sessionId": {
        "type": "text",
        "notNull": false
    },
    "customData": {
        "type": "json"
    },
    "createdAt": {
        "type": "bigint"
    },
    "updatedAt": {
        "type": "bigint"
    }
},
    ifNotExists: true
  }, cb),
(cb) => db.createTable('userlocation', {
    columns: {
    "id": {
        "type": "text",
        "primaryKey": true
    },
    "name": {
        "type": "text",
        "notNull": false
    },
    "city": {
        "type": "text",
        "notNull": false
    },
    "home": {
        "type": "text",
        "notNull": false
    },
    "housing": {
        "type": "text",
        "notNull": false
    },
    "index": {
        "type": "text",
        "notNull": false
    },
    "entrance": {
        "type": "text",
        "notNull": false
    },
    "floor": {
        "type": "text",
        "notNull": false
    },
    "apartment": {
        "type": "text",
        "notNull": false
    },
    "doorphone": {
        "type": "text",
        "notNull": false
    },
    "street": {
        "type": "text"
    },
    "isDefault": {
        "type": "boolean"
    },
    "user": {
        "type": "text"
    },
    "comment": {
        "type": "text",
        "notNull": false
    },
    "customData": {
        "type": "json"
    },
    "createdAt": {
        "type": "bigint"
    },
    "updatedAt": {
        "type": "bigint"
    }
},
    ifNotExists: true
  }, cb),
(cb) => db.createTable('userorderhistory', {
    columns: {
    "id": {
        "type": "text",
        "primaryKey": true
    },
    "uniqueItems": {
        "type": "real"
    },
    "orderTotal": {
        "type": "real"
    },
    "total": {
        "type": "real"
    },
    "order": {
        "type": "json"
    },
    "discountTotal": {
        "type": "real"
    },
    "comment": {
        "type": "text"
    },
    "totalWeight": {
        "type": "real"
    },
    "user": {
        "type": "text"
    },
    "createdAt": {
        "type": "bigint"
    },
    "updatedAt": {
        "type": "bigint"
    }
},
    ifNotExists: true
  }, cb),
(cb) => db.createTable('dish_images__mediafile_dish', {
    columns: {
    "id": {
        "type": "int",
        "autoIncrement": true
    },
    "dish_images": {
        "type": "text"
    },
    "mediafile_dish": {
        "type": "text"
    }
},
    ifNotExists: true
  }, cb),
(cb) => db.createTable('group_images__mediafile_group', {
    columns: {
    "id": {
        "type": "int",
        "autoIncrement": true
    },
    "group_images": {
        "type": "text"
    },
    "mediafile_group": {
        "type": "text"
    }
},
    ifNotExists: true
  }, cb),
(cb) => db.createTable('promotion_promotionCode__promotioncode_promotion', {
    columns: {
    "id": {
        "type": "int",
        "autoIncrement": true
    },
    "promotion_promotionCode": {
        "type": "text"
    },
    "promotioncode_promotion": {
        "type": "text"
    }
},
    ifNotExists: true
  }, cb),

  ], callback);
}

exports.down = function(db) {
  return null;
};

exports._meta = {
  "version": 1
};
