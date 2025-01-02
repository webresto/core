export declare const fsw: {
    writeFile(filePath: string, data: string): Promise<void>;
    readFile(filePath: string): Promise<string>;
    unlink(filePath: string): Promise<void>;
    exists(filePath: string): Promise<boolean>;
    mkdir(dirPath: string): Promise<void>;
    copyFile(src: string, dest: string): Promise<void>;
};
