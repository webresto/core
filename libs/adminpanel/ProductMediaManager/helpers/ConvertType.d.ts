import { MediaManagerItem } from "sails-adminpanel/lib/media-manager/AbstractMediaManager";
import { MediaFileRecord } from "../../../../models/MediaFile";
export declare class ConvertType {
    static MF2Item(mf: MediaFileRecord): MediaManagerItem;
    static MF2Item(mf: MediaFileRecord[]): MediaManagerItem[];
    static Item2MF(item: Partial<MediaManagerItem>): MediaFileRecord;
    static Item2MF(items: Partial<MediaManagerItem>[]): MediaFileRecord[];
}
