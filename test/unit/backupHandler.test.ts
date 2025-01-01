import * as fs from 'fs';
import * as path from 'path';
import * as tar from 'tar';
import * as sinon from 'sinon';
import { expect } from 'chai';
import { BackupHandler } from '../../libs/BackupHandler';
import groupGenerator from '../generators/group.generator';
import dishGenerator from '../generators/dish.generator';

describe('BackupHandler', () => {
  let mockGroups: any[];
  let mockDishes: any[];

  let fsWriteFileSync: sinon.SinonStub;
  let fsExistsSync: sinon.SinonStub;
  let fsCpSync: sinon.SinonStub;
  let fsUnlinkSync: sinon.SinonStub;
  let tarC: sinon.SinonStub;
  let tarX: sinon.SinonStub;
  let fsReadFileSync: sinon.SinonStub;

  beforeEach(() => {
    // Генерация тестовых данных с помощью генераторов
    mockGroups = [
      groupGenerator({ name: 'Group1' }),
      groupGenerator({ name: 'Group2' })
    ];

    mockDishes = [
      dishGenerator({ name: 'Dish1', price: 100, concept: 'Concept1', images: [{ variant: { origin: 'image1.jpg' }, id: 'img1' }] }),
      dishGenerator({ name: 'Dish2', price: 200, concept: 'Concept2', images: [{ variant: { origin: 'image2.jpg' }, id: 'img2' }] })
    ];

    // Мокирование зависимостей
    sinon.stub(Group, 'find').resolves(mockGroups);
    sinon.stub(Dish, 'find').resolves(mockDishes);

    fsWriteFileSync = sinon.stub(fs, 'writeFileSync');
    fsExistsSync = sinon.stub(fs, 'existsSync');
    fsCpSync = sinon.stub(fs, 'cpSync');
    fsUnlinkSync = sinon.stub(fs, 'unlinkSync');
    tarC = sinon.stub(tar, 'c').resolves(undefined);
    tarX = sinon.stub(tar, 'x').resolves(undefined);
    fsReadFileSync = sinon.stub(fs, 'readFileSync');
  });

  afterEach(() => {
    sinon.restore();
  });

  it('should export data and images', async () => {
    // Мокирование поведения fs.existsSync, чтобы файлы всегда существовали
    fsExistsSync.returns(true);

    // Экспорт данных и изображений
    const backupHandler = new BackupHandler();
    await backupHandler.exportToTar('./backup.tar', { isDeleted: true, concepts: ['exampleConcept'] });

    // Проверка, что методы были вызваны
    sinon.assert.calledOnce(fsWriteFileSync); // Проверка, что fs.writeFileSync был вызван один раз
    sinon.assert.calledOnce(tarC); // Проверка, что tar.c был вызван один раз
    sinon.assert.calledWith(fsCpSync, 'image1.jpg', sinon.match.string); // Проверка, что fs.cpSync был вызван с нужными аргументами
    sinon.assert.calledWith(fsCpSync, 'image2.jpg', sinon.match.string); // Проверка, что fs.cpSync был вызван с нужными аргументами
    sinon.assert.calledWith(fsUnlinkSync, sinon.match.string); // Проверка, что fs.unlinkSync был вызван с нужным аргументом
  });

  it('should import data and images', async () => {
    // Мокирование поведения fs.readFileSync
    fsReadFileSync.returns(JSON.stringify({ groups: mockGroups, dishes: mockDishes }));

    // Мокирование поведения fs.existsSync, чтобы файлы всегда существовали
    fsExistsSync.returns(true);

    // Импорт данных и изображений
    const backupHandler = new BackupHandler();
    await backupHandler.importFromTar('./backup.tar');

    // Проверка, что методы были вызваны
    sinon.assert.calledOnce(tarX); // Проверка, что tar.x был вызван один раз
    sinon.assert.calledOnce(fsReadFileSync); // Проверка, что fs.readFileSync был вызван один раз
    sinon.assert.calledWith(fsExistsSync, 'image1.jpg'); // Проверка, что fs.existsSync был вызван с нужным аргументом
    sinon.assert.calledWith(fsExistsSync, 'image2.jpg'); // Проверка, что fs.existsSync был вызван с нужным аргументом
  });

  it('should generate correct JSON data from createJSON method', async () => {
    const backupHandler = new BackupHandler();

    // Проверка, что createJSON возвращает правильный формат данных
    const jsonData = await backupHandler['createJSON']({ isDeleted: true, concepts: ['exampleConcept'] });
    const parsedData = JSON.parse(jsonData);

    expect(parsedData.kernelVersion).to.be.a('string'); // Проверка, что версия ядра является строкой
    expect(parsedData.groups).to.deep.equal(mockGroups); // Проверка, что данные о группах соответствуют mockGroups
    expect(parsedData.dishes).to.deep.equal(mockDishes); // Проверка, что данные о блюдах соответствуют mockDishes
  });

  it('should warn when image is not found in checkAndLoadImage', () => {
    const backupHandler = new BackupHandler();

    // Мокирование fs.existsSync, чтобы имитировать отсутствие файла
    fsExistsSync.returns(false);

    // Шпион на console.warn
    const spy = sinon.spy(console, 'warn');

    // Проверка, что появляется предупреждение, когда изображение не найдено
    backupHandler['checkAndLoadImage']('nonexistent.jpg');

    sinon.assert.calledWith(spy, 'Image not found: nonexistent.jpg'); // Проверка, что warning был вызван с правильным сообщением

    spy.restore();
  });

  it('should export images correctly', () => {
    const backupHandler = new BackupHandler();

    // Мокирование fs.existsSync и fs.cpSync
    fsExistsSync.returns(true);

    // Запуск экспорта изображений
    backupHandler['exportImages'](mockDishes, './exportDir');

    // Проверка, что изображения были экспортированы
    sinon.assert.calledWith(fsCpSync, 'image1.jpg', sinon.match.string); // Проверка, что fs.cpSync был вызван с нужными аргументами
    sinon.assert.calledWith(fsCpSync, 'image2.jpg', sinon.match.string); // Проверка, что fs.cpSync был вызван с нужными аргументами
  });
});
