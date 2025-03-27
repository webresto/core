import { mock } from "intermock";
import { readFiles, FileTuples } from "intermock/build/src/lib/read-files";
import { readdir } from "fs";
import { promisify } from "util";

const listFiles = promisify(readdir);

const isRecord = (o: any): o is Record<string, any> =>
  o != null && typeof o === "object" && !(o instanceof Array) && Object.keys(o).reduce((result, key) => result && typeof key === "string", true);

export class MockSet {
  private static instance: MockSet;

  declarationPaths: string[];
  fileNames: string[];
  fileData: FileTuples;
  mocks: Record<string, any>;
  extension: string;
  interfaces?: string[];

  constructor() {
    this.declarationPaths = ["../../models/", "../../interfaces/", "../../adapters/", "../../config/", "../../libs/"];
    this.extension = ".d.ts";
    //this.interfaces = options.interfaces;
  }

  public static getInstance(): MockSet {
    if (!MockSet.instance) {
      MockSet.instance = new MockSet();
    }
    return MockSet.instance;
  }

  async mock(interfaces: string[]): Promise<any> {
    this.fileNames = await this.getAllFiles(this.declarationPaths);

    this.fileData = await readFiles(this.fileNames);

    const mocks = await mock({
      output: "object",
      files: this.fileData,
      isFixedMode: true,
      interfaces: interfaces,
      isOptionalAlwaysEnabled: true,
    });
    //if (!isRecord(mocks)) throw new Error('unable to generate mocks');
    return mocks;
  }

  async getAllFiles(paths: string[]): Promise<string[]> {
    const fileList = [];
    for (let path of paths) {
      path = path.replace(/\/$/, "");
      path = path.startsWith("./") ? path : `./${path}`;
      const contents = await listFiles(path, { withFileTypes: true });
      for (const file of contents) {
        if (file.isFile() && file.name.endsWith(this.extension)) fileList.push(`${path}/${file.name}`);
        if (file.isDirectory()) fileList.push(...(await this.getAllFiles([`${path}/${file.name}`])));
      }
    }
    return fileList;
  }
}
