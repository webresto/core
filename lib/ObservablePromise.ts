export class ObservablePromise<T> {
    private _status: 'pending' | 'fulfilled' | 'rejected' = 'pending';
    private _promise: Promise<T>;

    constructor(promise: Promise<T>) {
        this._promise = promise
            .then(
                (value: T) => {
                    this._status = 'fulfilled';
                    return value;
                },
                (error) => {
                    this._status = 'rejected';
                    throw error;
                }
            );
    }

    get promise(): Promise<T> {
        return this._promise;
    }

    get status(): 'pending' | 'fulfilled' | 'rejected' {
        return this._status;
    }
}