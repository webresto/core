declare class ObservablePromise<T> {
    private _status;
    private _promise;
    constructor(promise: Promise<T>);
    get promise(): Promise<T>;
    get status(): 'pending' | 'fulfilled' | 'rejected';
}
