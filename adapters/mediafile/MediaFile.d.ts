/**
 *
 */
export default class MediaFile {
    url: string;
    name: {
        origin: string;
    };
    key: string;
    constructor(url: string, name: {
        origin: string;
    }, key: string);
}
