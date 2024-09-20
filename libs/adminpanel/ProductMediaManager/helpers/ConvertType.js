"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ConvertType = void 0;
class ConvertType {
    static MF2Item(mf) {
        let processItem = (mfItem) => {
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
            return {
                id: item.id,
                original: item.path,
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
