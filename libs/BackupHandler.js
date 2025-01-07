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
        this.workDir = null;
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
            this.workDir = path.join(currentDir, `.tmp/backup-${timestamp}`);
            // Создаем папку, если она не существует
            await fs_1.fsw.mkdir(this.workDir);
            // Путь для JSON файла
            const jsonFilePath = path.join(this.workDir, 'data.json');
            // Создание JSON данных
            const jsonData = await this.createJSON(finalOptions);
            await fs_1.fsw.writeFile(jsonFilePath, jsonData);
            // Экспорт изображений в временную директорию
            await this.exportImages(this.dishes, this.workDir);
            // Упаковка всего содержимого в tar файл
            await this.tar.c({
                gzip: true,
                file: filePath,
                cwd: this.workDir
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
            // Get the current directory
            const currentDir = process.cwd();
            // Create a directory for unpacking
            const timestamp = Date.now();
            this.workDir = path.join(currentDir, `.tmp/backup-${timestamp}`);
            // Create a folder if it does not exist
            await fs_1.fsw.mkdir(this.workDir);
            console.log(`Extracting tar file to: ${this.workDir}`);
            // Unpack the archive into the specified directory
            await this.tar.x({
                file: filePath,
                cwd: this.workDir,
            });
            // Reading JSON data
            const jsonFilePath = path.join(this.workDir, 'data.json');
            const jsonData = await fs_1.fsw.readFile(jsonFilePath);
            const importedData = JSON.parse(jsonData);
            this.groups = importedData.groups;
            this.dishes = importedData.dishes;
            // Checking and uploading images
            for (const dish of this.dishes) {
                if (dish.images && Array.isArray(dish.images)) {
                    let count = 1;
                    for (const image of dish.images) {
                        const ext = path.extname(image.originalFilePath) || '.webp';
                        const imagePath = path.join(this.workDir, `${dish.id}__${count}${ext}`);
                        this.checkAndLoadImage(imagePath);
                        count++;
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
        // Извлечение имени файла
        const fileName = path.basename(imagePath);
        // Разделение имени файла по разделителю "__"
        const parts = fileName.split('__');
        if (parts.length !== 2) {
            console.warn(`File name format is incorrect: ${fileName}`);
            return;
        }
        const dishID = parts[0]; // Левая часть до "__"
        const countPart = parts[1].split('.'); // Правая часть (порядковый номер и расширение)
        if (countPart.length < 2) {
            console.warn(`File name format is incorrect: ${fileName}`);
            return;
        }
        const count = parseInt(countPart[0], 10); // Извлекаем порядковый номер (число)
        if (isNaN(count)) {
            console.warn(`File name format is incorrect: ${fileName}`);
            return;
        }
        // Проверка существования файла
        if (await fs_1.fsw.exists(imagePath)) {
            await this.loadImage(imagePath, dishID, count);
        }
        else {
            console.warn(`Image not found: ${imagePath}`);
        }
    }
    // Simulate loading an image
    async loadImage(imagePath, dishId, sortOrder) {
        console.log(`Loading image: ${imagePath}`);
        const model = 'dish';
        const mfAdater = await Adapter.getMediaFileAdapter();
        const mediaFileImage = await mfAdater.toProcess(`file://${imagePath}`, model, "image");
        let init = {};
        init[`mediafile_${model}`] = mediaFileImage.id;
        init[model] = dishId;
        init["sortOrder"] = sortOrder;
        await SelectedMediaFile.create(init).fetch();
    }
    // Export images to a directory
    async exportImages(dishes, exportDir) {
        this.workDir = exportDir;
        const imagesDir = path.join(this.workDir);
        for (const dish of dishes) {
            if (dish.images && Array.isArray(dish.images)) {
                let count = 1;
                for (const image of dish.images) {
                    if (image.originalFilePath) {
                        const ext = path.extname(image.originalFilePath);
                        const imageFileName = `${dish.id}_${count}${ext}`;
                        const destinationPath = path.join(imagesDir, imageFileName);
                        if (await fs_1.fsw.exists(image.originalFilePath)) {
                            await fs_1.fsw.copyFile(image.originalFilePath, destinationPath);
                            console.log(`Image exported: ${imageFileName}`);
                        }
                        else {
                            console.warn(`Image file not found: ${image.originalFilePath}`);
                        }
                        count++;
                    }
                }
            }
        }
    }
}
exports.BackupHandler = BackupHandler;
