"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// npx mocha -r ts-node/register test/unit/backupHandler/backupHandler.test.ts
const sinon = __importStar(require("sinon"));
const chai_1 = require("chai");
const BackupHandler_1 = require("../../../libs/BackupHandler");
const group_generator_1 = __importDefault(require("../../generators/group.generator"));
const dish_generator_1 = __importDefault(require("../../generators/dish.generator"));
const fs_1 = require("../../../libs/wrapper/fs");
const scriptName = process.argv.find(arg => arg.endsWith('.ts') || arg.endsWith('.js'));
if (scriptName && scriptName.includes('backupHandler.test.ts')) {
    // @ts-ignore
    global.Group = {
        find: () => { }
    };
    // @ts-ignore
    global.Dish = {
        find: () => { }
    };
}
describe('BackupHandler', () => {
    let mockGroups;
    let mockDishes;
    let fsWriteFile;
    let fsExists;
    let fsCopyFile;
    let fsUnlink;
    // let tarC: sinon.SinonStub;
    // let tarX: sinon.SinonStub;
    let fsReadFile;
    beforeEach(() => {
        // Generate test data using generators
        mockGroups = [
            (0, group_generator_1.default)({ name: 'Group1' }),
            (0, group_generator_1.default)({ name: 'Group2' })
        ];
        mockDishes = [
            (0, dish_generator_1.default)({ id: "dish-1", name: 'Dish1', price: 100, concept: 'Concept1', images: [{ variant: { origin: 'image1.jpg' }, id: 'img1', originalFilePath: "image1.jpg" }] }),
            (0, dish_generator_1.default)({ id: "dish-2", name: 'Dish2', price: 200, concept: 'Concept2', images: [{ variant: { origin: 'image2.jpg' }, id: 'img2', originalFilePath: "image2.jpg" }] })
        ];
        // Mock fsw and tar dependencies
        fsWriteFile = sinon.spy(fs_1.fsw, 'writeFile');
        fsExists = sinon.stub(fs_1.fsw, 'exists').resolves(true);
        fsCopyFile = sinon.stub(fs_1.fsw, 'copyFile').resolves(undefined);
        fsUnlink = sinon.stub(fs_1.fsw, 'unlink').resolves(undefined);
        fsReadFile = sinon.stub(fs_1.fsw, 'readFile').resolves(JSON.stringify({ groups: mockGroups, dishes: mockDishes }));
        // Important: Do not override already mocked methods
        sinon.stub(Group, 'find').resolves(mockGroups);
        sinon.stub(Dish, 'find').resolves(mockDishes);
    });
    afterEach(() => {
        sinon.restore();
    });
    it('should export data and images', async () => {
        // Export data and images
        const backupHandler = new BackupHandler_1.BackupHandler();
        await backupHandler.exportToTar('./backup.tar', { isDeleted: true, concepts: ['exampleConcept'] });
        // Check that methods were called
        sinon.assert.calledOnce(fsWriteFile); // Check that fs.writeFile was called once
        // sinon.assert.calledOnce(tarC); // Check that tar.c was called once
        sinon.assert.calledWith(fsCopyFile, 'image1.jpg', sinon.match.string); // Check that fs.copyFile was called with the expected arguments
        sinon.assert.calledWith(fsCopyFile, 'image2.jpg', sinon.match.string); // Check that fs.copyFile was called with the expected arguments
        sinon.assert.calledOnce(fsUnlink); // Check that fs.unlink was called once
    });
    it('should import data and images', async () => {
        // Mock fs.existsSync behavior so files always exist
        fsExists.resolves(true);
        // Import data and images
        const backupHandler = new BackupHandler_1.BackupHandler();
        await backupHandler.importFromTar(`${__dirname}/backup.tar`);
        // Check that methods were called
        // sinon.assert.calledOnce(tarX); // Check that tar.x was called once
        sinon.assert.calledOnce(fsReadFile); // Check that fs.readFile was called once
        sinon.assert.calledWith(fsExists, `${backupHandler.workDir}/dish-1__1.jpg`); // Check that fs.exists was called with the correct argument
        sinon.assert.calledWith(fsExists, `${backupHandler.workDir}/dish-2__1.jpg`); // Check that fs.exists was called with the correct argument
    });
    it('should generate correct JSON data from createJSON method', async () => {
        const backupHandler = new BackupHandler_1.BackupHandler();
        // Check that createJSON returns data in the correct format
        const jsonData = await backupHandler['createJSON']({ isDeleted: true, concepts: ['exampleConcept'], turncate: false });
        const parsedData = JSON.parse(jsonData);
        (0, chai_1.expect)(parsedData.kernelVersion).to.be.a('string'); // Check that the kernel version is a string
        (0, chai_1.expect)(parsedData.groups).to.deep.equal(mockGroups); // Check that the group data matches mockGroups
        (0, chai_1.expect)(parsedData.dishes).to.deep.equal(mockDishes); // Check that the dish data matches mockDishes
    });
    it('should warn when image is not found in checkAndLoadImage', async () => {
        const backupHandler = new BackupHandler_1.BackupHandler();
        // Mock fs.exists to simulate a missing file
        fsExists.resolves(false);
        // Spy on console.warn
        const spy = sinon.spy(console, 'warn');
        // Check that a warning appears when an image is not found
        await backupHandler['checkAndLoadImage']('/nonexistent__1.jpg'); // await добавлен
        sinon.assert.calledWith(spy, 'Image not found: /nonexistent__1.jpg');
        spy.restore();
    });
    it('should export images correctly', async () => {
        const backupHandler = new BackupHandler_1.BackupHandler();
        // Mock fs.exists and fs.copyFile
        fsExists.resolves(true);
        // Run image export
        await backupHandler['exportImages'](mockDishes, './exportDir');
        // Check that images were exported
        sinon.assert.calledWith(fsCopyFile, 'image1.jpg', sinon.match.string); // Check that fs.copyFile was called with the expected arguments
        sinon.assert.calledWith(fsCopyFile, 'image2.jpg', sinon.match.string); // Check that fs.copyFile was called with the expected arguments
    });
    it('should load image when file exists', async () => {
        const backupHandler = new BackupHandler_1.BackupHandler();
        // Mock fs.exists to simulate existing file
        fsExists.resolves(true);
        // Spy on loadImage method
        const loadImageStub = sinon.stub(backupHandler, 'loadImage').resolves();
        const imagePath = '/dish:123__4.jpg';
        const dishID = "dish:123";
        const sortOrder = 4;
        // Call checkAndLoadImage
        await backupHandler['checkAndLoadImage'](imagePath);
        // Check that loadImage was called with the correct arguments
        sinon.assert.calledWith(loadImageStub, imagePath, dishID, sortOrder);
    });
});
