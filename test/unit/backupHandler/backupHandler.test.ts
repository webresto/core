import * as tar from 'tar'; // Import the tar module
import * as sinon from 'sinon';
import { expect } from 'chai';
import { BackupHandler } from '../../../libs/BackupHandler';
import groupGenerator from '../../generators/group.generator';
import dishGenerator from '../../generators/dish.generator';
import { fsw } from '../../../libs/wrapper/fs'; // Import fsw for mocking

const scriptName = process.argv.find(arg => arg.endsWith('.ts') || arg.endsWith('.js'));
if (scriptName && scriptName.includes('backupHandler.test.ts')) {
  // @ts-ignore
  global.Group = {
    find: () => {}
  };
  // @ts-ignore
  global.Dish = {
    find: () => {}
  };
}

describe('BackupHandler', () => {
  let mockGroups: any[];
  let mockDishes: any[];

  let fsWriteFile: sinon.SinonSpy;
  let fsExists: sinon.SinonStub;
  let fsCopyFile: sinon.SinonStub;
  let fsUnlink: sinon.SinonStub;
  let tarC: sinon.SinonStub;
  let tarX: sinon.SinonStub;
  let fsReadFile: sinon.SinonStub;

  beforeEach(() => {
    // Generate test data using generators
    mockGroups = [
      groupGenerator({ name: 'Group1' }),
      groupGenerator({ name: 'Group2' })
    ];

    mockDishes = [
      dishGenerator({ name: 'Dish1', price: 100, concept: 'Concept1', images: [{ variant: { origin: 'image1.jpg' }, id: 'img1' }] }),
      dishGenerator({ name: 'Dish2', price: 200, concept: 'Concept2', images: [{ variant: { origin: 'image2.jpg' }, id: 'img2' }] })
    ];

    // Mock fsw and tar dependencies
    fsWriteFile = sinon.spy(fsw, 'writeFile');
    fsExists = sinon.stub(fsw, 'exists').resolves(true);
    fsCopyFile = sinon.stub(fsw, 'copyFile').resolves(undefined);
    fsUnlink = sinon.stub(fsw, 'unlink').resolves(undefined);
    fsReadFile = sinon.stub(fsw, 'readFile').resolves(JSON.stringify({ groups: mockGroups, dishes: mockDishes }));

    // Important: Do not override already mocked methods
    sinon.stub(Group, 'find').resolves(mockGroups);
    sinon.stub(Dish, 'find').resolves(mockDishes);
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should export data and images', async () => {
    // Export data and images
    const backupHandler = new BackupHandler();
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
    const backupHandler = new BackupHandler();
    await backupHandler.importFromTar(`${__dirname}/backup.tar`);

    // Check that methods were called
    // sinon.assert.calledOnce(tarX); // Check that tar.x was called once
    sinon.assert.calledOnce(fsReadFile); // Check that fs.readFile was called once
    sinon.assert.calledWith(fsExists, 'image1.jpg'); // Check that fs.exists was called with the correct argument
    sinon.assert.calledWith(fsExists, 'image2.jpg'); // Check that fs.exists was called with the correct argument
  });

  it('should generate correct JSON data from createJSON method', async () => {
    const backupHandler = new BackupHandler();

    // Check that createJSON returns data in the correct format
    const jsonData = await backupHandler['createJSON']({ isDeleted: true, concepts: ['exampleConcept'], turncate: false });
    const parsedData = JSON.parse(jsonData);

    expect(parsedData.kernelVersion).to.be.a('string'); // Check that the kernel version is a string
    expect(parsedData.groups).to.deep.equal(mockGroups); // Check that the group data matches mockGroups
    expect(parsedData.dishes).to.deep.equal(mockDishes); // Check that the dish data matches mockDishes
  });

  it('should warn when image is not found in checkAndLoadImage', () => {
    const backupHandler = new BackupHandler();

    // Mock fs.exists to simulate a missing file
    fsExists.resolves(false);

    // Spy on console.warn
    const spy = sinon.spy(console, 'warn');

    // Check that a warning appears when an image is not found
    backupHandler['checkAndLoadImage']('nonexistent.jpg');

    sinon.assert.calledWith(spy, 'Image not found: nonexistent.jpg'); // Check that the warning was called with the correct message

    spy.restore();
  });

  it('should export images correctly', async () => {
    const backupHandler = new BackupHandler();

    // Mock fs.exists and fs.copyFile
    fsExists.resolves(true);

    // Run image export
    await backupHandler['exportImages'](mockDishes, './exportDir');

    // Check that images were exported
    sinon.assert.calledWith(fsCopyFile, 'image1.jpg', sinon.match.string); // Check that fs.copyFile was called with the expected arguments
    sinon.assert.calledWith(fsCopyFile, 'image2.jpg', sinon.match.string); // Check that fs.copyFile was called with the expected arguments
  });
});
