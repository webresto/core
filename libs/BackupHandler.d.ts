interface BaseOptions {
    isDeleted: boolean;
    concepts: string[];
}
interface RestoreOptions extends BaseOptions {
    turncate: false;
}
interface BackupOptions extends BaseOptions {
    turncate: false;
}
export declare class BackupHandler {
    private groups;
    private dishes;
    workDir: string;
    tar: any;
    exportToTar(filePath: string, options?: Partial<BackupOptions>): Promise<void>;
    importFromTar(filePath: string, options?: Partial<RestoreOptions>): Promise<void>;
    private createJSON;
    private checkAndLoadImage;
    private loadImage;
    private exportImages;
}
export {};
