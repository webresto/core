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
Object.defineProperty(exports, "__esModule", { value: true });
exports.BackupHandler = void 0;
const path = __importStar(require("path"));
const tar = __importStar(require("tar"));
const fs_1 = require("./wrapper/fs");
const defaultOptions = {
    isDeleted: false,
    concepts: [],
    turncate: false
};
class BackupHandler {
    constructor() {
        this.groups = [];
        this.dishes = [];
        this.tar = tar;
    }
    // Export data and images to a tar file
    async exportToTar(filePath, options = {}) {
        try {
            const finalOptions = { ...defaultOptions, ...options };
            // Получаем текущую директорию для создания временной папки
            const currentDir = process.cwd();
            // Создаем временную директорию для экспорта
            const timestamp = Date.now();
            const exportDir = path.join(currentDir, `.tmp/backup-${timestamp}`);
            // Создаем папку, если она не существует
            await fs_1.fsw.mkdir(exportDir);
            // Путь для JSON файла
            const jsonFilePath = path.join(exportDir, 'data.json');
            // Создание JSON данных
            const jsonData = await this.createJSON(finalOptions);
            await fs_1.fsw.writeFile(jsonFilePath, jsonData);
            // Экспорт изображений в временную директорию
            await this.exportImages(this.dishes, exportDir);
            // Упаковка всего содержимого в tar файл
            await this.tar.c({
                gzip: true,
                file: filePath,
                cwd: exportDir
            }, ['.']);
            // Удаление временных файлов
            await fs_1.fsw.unlink(jsonFilePath);
            console.log('Export completed:', filePath);
        }
        catch (error) {
            new Error;
            console.error('Export error:', error);
        }
    }
    // Import data and images from a tar file
    async importFromTar(filePath) {
        try {
            // Получаем текущую директорию
            const currentDir = process.cwd();
            // Создаем директорию для распаковки
            const timestamp = Date.now();
            const extractDir = path.join(currentDir, `.tmp/backup-${timestamp}`);
            // Создаем папку, если она не существует
            await fs_1.fsw.mkdir(extractDir);
            console.log(`Extracting tar file to: ${extractDir}`);
            // Распаковываем архив в указанную директорию
            await this.tar.x({
                file: filePath,
                cwd: extractDir,
            });
            // Читаем данные JSON
            const jsonFilePath = path.join(extractDir, 'data.json');
            const jsonData = await fs_1.fsw.readFile(jsonFilePath);
            const importedData = JSON.parse(jsonData);
            this.groups = importedData.groups;
            this.dishes = importedData.dishes;
            // Проверяем и загружаем изображения
            for (const dish of this.dishes) {
                if (dish.images && Array.isArray(dish.images)) {
                    for (const image of dish.images) {
                        const imagePath = path.join(extractDir, `${image.id}.jpg`);
                        this.checkAndLoadImage(imagePath); // Предположим, что это ваш метод для проверки и загрузки изображений
                    }
                }
            }
            console.log('Import completed:', filePath);
        }
        catch (error) {
            console.error('Import error:', error);
        }
    }
    // Create JSON data
    async createJSON(options) {
        const groups = await Group.find({
            isDeleted: options.isDeleted,
            ...(options.concepts.length && { concepts: { $in: options.concepts } })
        });
        const dishes = await Dish.find({
            isDeleted: options.isDeleted,
            ...(options.concepts.length && { concepts: { $in: options.concepts } })
        });
        this.groups = groups;
        this.dishes = dishes;
        const kernelVersion = process.version;
        return JSON.stringify({ kernelVersion, groups, dishes }, null, 2);
    }
    // Check file existence and load image
    async checkAndLoadImage(imagePath) {
        if (await fs_1.fsw.exists(imagePath)) {
            this.loadImage(imagePath);
        }
        else {
            console.warn(`Image not found: ${imagePath}`);
        }
    }
    // Simulate loading an image
    loadImage(imagePath) {
        console.log(`Loading image: ${imagePath}`);
    }
    // Export images to a directory
    async exportImages(dishes, exportDir) {
        const imagesDir = path.join(exportDir);
        dishes.forEach(dish => {
            if (dish.images && Array.isArray(dish.images)) {
                dish.images.forEach((image) => {
                    Object.entries(image.variant).forEach(async ([variantName, variantPath]) => {
                        if (variantPath) {
                            const imageFileName = `${variantName}_${image.id}.jpg`;
                            const destinationPath = path.join(imagesDir, imageFileName);
                            if (await fs_1.fsw.exists(variantPath)) {
                                await fs_1.fsw.copyFile(variantPath, destinationPath);
                                console.log(`Image exported: ${imageFileName}`);
                            }
                            else {
                                console.warn(`Image file not found: ${variantPath}`);
                            }
                        }
                    });
                });
            }
        });
    }
}
exports.BackupHandler = BackupHandler;
