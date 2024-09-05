import { File, Item, UploaderFile, imageSizes } from 'sails-adminpanel/lib/media-manager/AbstractMediaManager';
import sharp from "sharp";
export declare class ImageItem extends File<Item> {
    type: "application" | "audio" | "example" | "image" | "message" | "model" | "multipart" | "text" | "video";
    constructor(path: string, dir: string, model: string, metaModel: string);
    getItems(limit: number, skip: number, sort: string): Promise<{
        data: Item[];
        next: boolean;
    }>;
    search(s: string): Promise<Item[]>;
    upload(file: UploaderFile, filename: string, origFileName: string, imageSizes?: imageSizes | {}): Promise<Item>;
    getChildren(id: string): Promise<Item[]>;
    protected createSizes(file: UploaderFile, parent: Item, filename: string, imageSizes: imageSizes): Promise<void>;
    protected createThumb(id: string, file: UploaderFile, filename: string, origFileName: string): Promise<void>;
    protected createEmptyMeta(id: string): Promise<void>;
    getMeta(id: string): Promise<{
        key: string;
        value: string;
    }[]>;
    setMeta(id: string, data: {
        [p: string]: string;
    }): Promise<{
        msg: "success";
    }>;
    protected resizeImage(input: string, output: string, width: number, height: number): Promise<sharp.OutputInfo>;
    uploadCropped(parent: Item, file: UploaderFile, filename: string, config: {
        width: number;
        height: number;
    }): Promise<Item>;
    delete(id: string): Promise<void>;
}
