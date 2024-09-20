import { File, MediaManagerItem, MediaFileType, UploaderFile } from 'sails-adminpanel/lib/media-manager/AbstractMediaManager';
export declare class ImageItem extends File<MediaManagerItem> {
    getMeta(id: string): Promise<{
        key: string;
        value: string;
    }[]>;
    type: MediaFileType;
    upload(file: UploaderFile, filename: string, origFileName: string, group?: string): Promise<MediaManagerItem[]>;
    setMeta(id: string, data: {
        [key: string]: string;
    }): Promise<void>;
    getVariants(id: string): Promise<MediaManagerItem[]>;
    uploadVariant(item: MediaManagerItem, file: UploaderFile, fileName: string, group?: string, localeId?: string): Promise<MediaManagerItem>;
    getOrirgin(id: string): Promise<string>;
    getItems(limit: number, skip: number, sort: string): Promise<{
        data: MediaManagerItem[];
        next: boolean;
    }>;
    search(s: string): Promise<MediaManagerItem[]>;
    delete(id: string): Promise<void>;
}
