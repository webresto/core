"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockSet = void 0;
const intermock_1 = require("intermock");
const read_files_1 = require("intermock/build/src/lib/read-files");
const fs_1 = require("fs");
const util_1 = require("util");
const listFiles = util_1.promisify(fs_1.readdir);
const isRecord = (o) => o != null &&
    typeof o === 'object' &&
    !(o instanceof Array) &&
    Object.keys(o).reduce((result, key) => result && typeof key === 'string', true);
class MockSet {
    constructor() {
        this.declarationPaths = ["../../../models/", "../../../modelsHelp/", "../../../adapter/", "../../../config/", "../../../lib/"];
        this.extension = '.d.ts';
    }
    static getInstance() {
        if (!MockSet.instance) {
            MockSet.instance = new MockSet();
        }
        return MockSet.instance;
    }
    async mock(interfaces) {
        this.fileNames = await this.getAllFiles(this.declarationPaths);
        this.fileData = await read_files_1.readFiles(this.fileNames);
        const mocks = await intermock_1.mock({
            output: 'object',
            files: this.fileData,
            isFixedMode: false,
            interfaces: interfaces,
        });
        return mocks;
    }
    async getAllFiles(paths) {
        const fileList = [];
        for (let path of paths) {
            path = path.replace(/\/$/, '');
            path = path.startsWith('./') ? path : `./${path}`;
            const contents = await listFiles(path, { withFileTypes: true });
            for (const file of contents) {
                if (file.isFile() && file.name.endsWith(this.extension))
                    fileList.push(`${path}/${file.name}`);
                if (file.isDirectory())
                    fileList.push(...(await this.getAllFiles([`${path}/${file.name}`])));
            }
        }
        return fileList;
    }
}
exports.MockSet = MockSet;
