import { FileTuples } from 'intermock/build/src/lib/read-files';
export declare class MockSet {
    private static instance;
    declarationPaths: string[];
    fileNames: string[];
    fileData: FileTuples;
    mocks: Record<string, any>;
    extension: string;
    interfaces?: string[];
    constructor();
    static getInstance(): MockSet;
    mock(interfaces: string[]): Promise<any>;
    getAllFiles(paths: string[]): Promise<string[]>;
}
