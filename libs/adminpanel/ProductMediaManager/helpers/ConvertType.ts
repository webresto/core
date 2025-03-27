import { MediaManagerItem } from "sails-adminpanel/lib/media-manager/AbstractMediaManager";
import { MediaFileRecord } from "../../../../models/MediaFile";
const allowedTypes = ['video', 'image', 'audio'];

export class ConvertType {

    public static MF2Item(mf: MediaFileRecord): MediaManagerItem  
    public static MF2Item(mf: MediaFileRecord[]): MediaManagerItem[]
    public static MF2Item(mf: MediaFileRecord | MediaFileRecord[]): MediaManagerItem | MediaManagerItem[] {
        let processItem = (mfItem: MediaFileRecord): MediaManagerItem => {
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
        } else {
            return processItem(mf);
        }
    }
    
    public static Item2MF(item: Partial<MediaManagerItem>): MediaFileRecord  
    public static Item2MF(items: Partial<MediaManagerItem>[]): MediaFileRecord[]
    public static Item2MF(itemOrItems: Partial<MediaManagerItem> | Partial<MediaManagerItem>[]): MediaFileRecord | MediaFileRecord[] {
        let processItem = (item: Partial<MediaManagerItem>): MediaFileRecord => {
            const _type = item.mimeType.split('/')[0]
            return {
                id: item.id,
                original: `file://${item.path}`,
                originalFilePath: item.path,
                //@ts-ignore
                type: allowedTypes.includes(_type) ? _type : (() => { throw new Error(`Invalid type ${_type}`) })(),
                variant: {
                    origin: item.url
                }
            };
        };
    
        if (Array.isArray(itemOrItems)) {
            return itemOrItems.map((item) => processItem(item));
        } else {
            return processItem(itemOrItems);
        }
    }
}