"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObservablePromise = void 0;
class ObservablePromise {
    constructor(promise) {
        this._status = 'pending';
        this._promise = promise
            .then((value) => {
            this._status = 'fulfilled';
            return value;
        }, (error) => {
            this._status = 'rejected';
            throw error;
        });
    }
    get promise() {
        return this._promise;
    }
    get status() {
        return this._status;
    }
}
exports.ObservablePromise = ObservablePromise;
