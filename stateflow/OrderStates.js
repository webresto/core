"use strict";
module.exports = {
    /**
     * This is a first state, here only raw cart.
     * Any modification of cart is possible only in this state.
     * If you need to add promo goods or delete stopped dish, you need to be here
     */
    CART: {
        routeRules: async function (data, cb) {
            return "";
        },
        stateValidation: async function (data, cb) {
            cb();
        },
        inState: async function (data, cb) {
            cb();
        },
        afterState: async function (data, cb) {
            cb();
        },
    },
    /**
     * This stage of cart after totally checked
     * If you make any modification of cart, you need make checkout again
     * From checkout you may go to payment and order (for payment promise)
     */
    CHECKOUT: {
        routeRules: async function (data, cb) {
            return "";
        },
        stateValidation: async function (data, cb) {
            cb();
        },
        inState: async function (data, cb) {
            cb();
        },
        afterState: async function (data, cb) {
            cb();
        },
    },
    /**
     * When you pay online or through internal payment system (bonus),
     * you need stay here until you payment not finished, after you can go to ORDER
     */
    PAYMENT: {
        routeRules: async function (data, cb) {
            return "";
        },
        stateValidation: async function (data, cb) {
            cb();
        },
        inState: async function (data, cb) {
            cb();
        },
        afterState: async function (data, cb) {
            cb();
        },
    },
    /**
     * Here you order done, but is not means what your delivery done. It just Order
     * webresto/core as is in default not know about next flows, but RMS know when order was delivered.
     * Other modules can extend it, please check modules.webresto.org
     */
    ORDER: {
        routeRules: async function (data, cb) {
            return "";
        },
        stateValidation: async function (data, cb) {
            cb();
        },
        inState: async function (data, cb) {
            cb();
        },
        afterState: async function (data, cb) {
            cb();
        },
    },
};
