"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConvertType = void 0;
const allowedTypes = ['video', 'image', 'audio'];
class ConvertType {
    static MF2Item(mf) {
        let processItem = (mfItem) => {
            //@ts-ignore 
            return {
                id: mfItem.id,
                parent: "",
                variants: [],
                mimeType: 'image/*',
                path: mfItem.original,
                size: 0,
                url: mfItem.variant.origin,
                filename: '',
                tag: null,
                meta: []
            };
        };
        if (Array.isArray(mf)) {
            return mf.map((mfItem) => processItem(mfItem));
        }
        else {
            return processItem(mf);
        }
    }
    static Item2MF(itemOrItems) {
        let processItem = (item) => {
            const _type = item.mimeType.split('/')[0];
            return {
                id: item.id,
                original: `file://${item.path}`,
                originalFilePath: item.path,
                //@ts-ignore
                type: allowedTypes.includes(_type) ? _type : (() => { throw new Error(`Invalid type ${_type}`); })(),
                variant: {
                    origin: item.url
                }
            };
        };
        if (Array.isArray(itemOrItems)) {
            return itemOrItems.map((item) => processItem(item));
        }
        else {
            return processItem(itemOrItems);
        }
    }
}
exports.ConvertType = ConvertType;
