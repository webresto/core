"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ObservablePromise = void 0;
class ObservablePromise {
    _status = 'pending';
    _promise;
    constructor(promise) {
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
