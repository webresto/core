import * as tar from 'tar';
interface BackupOptions {
    isDeleted: boolean;
    concepts: string[];
    turncate: boolean;
}
export declare class BackupHandler {
    private groups;
    private dishes;
    workDir: string;
    tar: typeof tar;
    exportToTar(filePath: string, options?: Partial<BackupOptions>): Promise<void>;
    importFromTar(filePath: string): Promise<void>;
    private createJSON;
    private checkAndLoadImage;
    private loadImage;
    private exportImages;
}
export {};
